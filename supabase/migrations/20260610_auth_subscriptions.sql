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
  auth_provider text,
  profile_completed_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

alter table public.profiles add column if not exists auth_provider text;
alter table public.profiles add column if not exists profile_completed_at timestamptz;

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

create or replace function public.claim_current_device(
  p_device_fingerprint text,
  p_device_name text,
  p_known_fingerprints text[] default null
)
returns table(ok boolean, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  active_other_count integer;
  current_user_role text;
  known_fingerprints text[];
  matching_device_id uuid;
  exact_row_count integer;
begin
  if auth.uid() is null then
    return query select false, 'not_authenticated';
    return;
  end if;

  known_fingerprints := array(
    select distinct trim(value)
    from unnest(array_append(coalesce(p_known_fingerprints, array[]::text[]), p_device_fingerprint)) as known(value)
    where value is not null
      and trim(value) ~ '^[A-Fa-f0-9]{64}$'
  );

  if array_length(known_fingerprints, 1) is null then
    return query select false, 'invalid_device';
    return;
  end if;

  select role
    into current_user_role
  from public.profiles
  where id = auth.uid()
    and status = 'active';

  if current_user_role is null then
    return query select false, 'not_authenticated';
    return;
  end if;

  if current_user_role <> 'admin' then
    select count(*)
      into active_other_count
    from public.devices
    where user_id = auth.uid()
      and revoked_at is null
      and not (device_fingerprint = any(known_fingerprints));

    if active_other_count >= 1 then
      return query select false, 'device_limit';
      return;
    end if;
  end if;

  update public.devices
  set device_name = p_device_name,
      last_seen_at = now(),
      revoked_at = null
  where user_id = auth.uid()
    and device_fingerprint = p_device_fingerprint;

  get diagnostics exact_row_count = row_count;

  if exact_row_count > 0 then
    update public.devices
    set revoked_at = now(),
        last_seen_at = now()
    where user_id = auth.uid()
      and revoked_at is null
      and device_fingerprint <> p_device_fingerprint
      and device_fingerprint = any(known_fingerprints);

    return query select true, 'ok';
    return;
  end if;

  select id
    into matching_device_id
  from public.devices
  where user_id = auth.uid()
    and device_fingerprint = any(known_fingerprints)
  order by (revoked_at is null) desc, last_seen_at desc nulls last, first_seen_at desc
  limit 1;

  if matching_device_id is not null then
    update public.devices
    set device_fingerprint = p_device_fingerprint,
        device_name = p_device_name,
        last_seen_at = now(),
        revoked_at = null
    where id = matching_device_id;

    return query select true, 'ok';
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
  user_provider text;
  user_role text;
begin
  select
    email::citext,
    coalesce(
      nullif(raw_user_meta_data->>'display_name', ''),
      nullif(raw_user_meta_data->>'name', ''),
      nullif(raw_user_meta_data->>'full_name', ''),
      nullif(raw_user_meta_data->>'user_name', ''),
      nullif(raw_user_meta_data->>'nickname', '')
    ),
    raw_user_meta_data->>'company',
    coalesce(raw_app_meta_data->>'provider', raw_app_meta_data->'providers'->>0, 'password')
    into user_email, user_display_name, user_company, user_provider
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

  insert into public.profiles (
    id,
    email,
    display_name,
    company,
    role,
    status,
    auth_provider,
    profile_completed_at,
    last_seen_at
  )
  values (
    auth.uid(),
    user_email,
    nullif(user_display_name, ''),
    nullif(user_company, ''),
    user_role,
    'active',
    nullif(user_provider, ''),
    case when nullif(user_company, '') is null then null else now() end,
    now()
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name),
        auth_provider = coalesce(excluded.auth_provider, public.profiles.auth_provider),
        last_seen_at = now();

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
  user_display_name text;
  user_company text;
  user_provider text;
begin
  if exists (select 1 from public.app_admin_emails where email = new.email::citext) then
    user_role := 'admin';
  else
    user_role := 'user';
  end if;

  user_display_name := coalesce(
    nullif(new.raw_user_meta_data->>'display_name', ''),
    nullif(new.raw_user_meta_data->>'name', ''),
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'user_name', ''),
    nullif(new.raw_user_meta_data->>'nickname', '')
  );
  user_company := new.raw_user_meta_data->>'company';
  user_provider := coalesce(new.raw_app_meta_data->>'provider', new.raw_app_meta_data->'providers'->>0, 'password');

  insert into public.profiles (
    id,
    email,
    display_name,
    company,
    role,
    status,
    auth_provider,
    profile_completed_at,
    last_seen_at
  )
  values (
    new.id,
    new.email::citext,
    nullif(user_display_name, ''),
    nullif(user_company, ''),
    user_role,
    'active',
    nullif(user_provider, ''),
    case when nullif(user_company, '') is null then null else now() end,
    now()
  )
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, plan, status, current_period_end)
  values (new.id, 'trial', 'trial', now() + interval '14 days')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create or replace function public.complete_current_profile(p_company text, p_display_name text default null)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'No authenticated user';
  end if;

  if nullif(trim(p_company), '') is null then
    raise exception 'Company is required';
  end if;

  update public.profiles
  set company = nullif(trim(p_company), ''),
      display_name = coalesce(nullif(trim(p_display_name), ''), display_name),
      profile_completed_at = now(),
      last_seen_at = now()
  where id = auth.uid()
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'Profile not found';
  end if;

  return updated_profile;
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
grant execute on function public.claim_current_device(text, text, text[]) to authenticated;
grant execute on function public.complete_current_profile(text, text) to authenticated;
