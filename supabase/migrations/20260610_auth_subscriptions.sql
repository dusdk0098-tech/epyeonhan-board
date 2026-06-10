create extension if not exists citext;
create extension if not exists pgcrypto;

create table if not exists public.app_admin_emails (
  email citext primary key,
  created_at timestamptz not null default now()
);

insert into public.app_admin_emails (email)
values ('hamori4919@naver.com')
on conflict (email) do nothing;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext not null,
  display_name text,
  company text,
  role text not null default 'user' check (role in ('user', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create table if not exists public.subscriptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  plan text not null default 'trial',
  status text not null default 'trial' check (status in ('trial', 'active', 'past_due', 'canceled', 'manual_active', 'suspended')),
  current_period_end timestamptz default (now() + interval '14 days'),
  stripe_customer_id text,
  stripe_subscription_id text,
  updated_at timestamptz not null default now()
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_fingerprint text not null,
  device_name text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (user_id, device_fingerprint)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null default auth.uid(),
  target_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;

create or replace function public.ensure_current_user_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  user_email citext;
  user_display_name text;
  user_company text;
  user_role text;
begin
  select email::citext, raw_user_meta_data->>'display_name', raw_user_meta_data->>'company'
    into user_email, user_display_name, user_company
  from auth.users
  where id = auth.uid();

  if user_email is null then
    raise exception 'No authenticated user';
  end if;

  if exists (select 1 from public.app_admin_emails where email = user_email) then
    user_role := 'admin';
  else
    user_role := 'user';
  end if;

  insert into public.profiles (id, email, display_name, company, role, status, last_seen_at)
  values (auth.uid(), user_email, nullif(user_display_name, ''), nullif(user_company, ''), user_role, 'active', now())
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, plan, status, current_period_end)
  values (auth.uid(), 'trial', 'trial', now() + interval '14 days')
  on conflict (user_id) do nothing;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_role text;
begin
  if exists (select 1 from public.app_admin_emails where email = new.email::citext) then
    user_role := 'admin';
  else
    user_role := 'user';
  end if;

  insert into public.profiles (id, email, display_name, company, role, status, last_seen_at)
  values (
    new.id,
    new.email::citext,
    nullif(new.raw_user_meta_data->>'display_name', ''),
    nullif(new.raw_user_meta_data->>'company', ''),
    user_role,
    'active',
    now()
  )
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, plan, status, current_period_end)
  values (new.id, 'trial', 'trial', now() + interval '14 days')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.touch_current_profile()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set last_seen_at = now()
  where id = auth.uid();
$$;

create or replace function public.claim_current_device(p_device_fingerprint text, p_device_name text)
returns table(ok boolean, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  active_other_count integer;
begin
  if auth.uid() is null then
    return query select false, 'not_authenticated';
    return;
  end if;

  select count(*)
    into active_other_count
  from public.devices
  where user_id = auth.uid()
    and revoked_at is null
    and device_fingerprint <> p_device_fingerprint;

  if active_other_count > 0 then
    return query select false, 'device_limit';
    return;
  end if;

  insert into public.devices (user_id, device_fingerprint, device_name, last_seen_at)
  values (auth.uid(), p_device_fingerprint, p_device_name, now())
  on conflict (user_id, device_fingerprint) do update
    set device_name = excluded.device_name,
        last_seen_at = now(),
        revoked_at = null;

  return query select true, 'ok';
end;
$$;

alter table public.app_admin_emails enable row level security;
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.devices enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "admin emails readable by admins" on public.app_admin_emails;
create policy "admin emails readable by admins"
on public.app_admin_emails for select
using (public.is_admin());

drop policy if exists "profiles readable by self or admins" on public.profiles;
create policy "profiles readable by self or admins"
on public.profiles for select
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles manageable by admins" on public.profiles;
create policy "profiles manageable by admins"
on public.profiles for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "subscriptions readable by self or admins" on public.subscriptions;
create policy "subscriptions readable by self or admins"
on public.subscriptions for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "subscriptions manageable by admins" on public.subscriptions;
create policy "subscriptions manageable by admins"
on public.subscriptions for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "devices readable by self or admins" on public.devices;
create policy "devices readable by self or admins"
on public.devices for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "devices manageable by admins" on public.devices;
create policy "devices manageable by admins"
on public.devices for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "audit logs readable by admins" on public.audit_logs;
create policy "audit logs readable by admins"
on public.audit_logs for select
using (public.is_admin());

drop policy if exists "audit logs insertable by admins" on public.audit_logs;
create policy "audit logs insertable by admins"
on public.audit_logs for insert
with check (public.is_admin());

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_status_idx on public.profiles(status);
create index if not exists subscriptions_status_idx on public.subscriptions(status);
create index if not exists devices_user_active_idx on public.devices(user_id, revoked_at);
create index if not exists audit_logs_target_idx on public.audit_logs(target_user_id, created_at desc);

grant usage on schema public to anon, authenticated;
grant select on public.app_admin_emails to authenticated;
grant select on public.profiles to authenticated;
grant update on public.profiles to authenticated;
grant select on public.subscriptions to authenticated;
grant update on public.subscriptions to authenticated;
grant select on public.devices to authenticated;
grant update on public.devices to authenticated;
grant select on public.audit_logs to authenticated;
grant insert on public.audit_logs to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.ensure_current_user_profile() to authenticated;
grant execute on function public.touch_current_profile() to authenticated;
grant execute on function public.claim_current_device(text, text) to authenticated;
