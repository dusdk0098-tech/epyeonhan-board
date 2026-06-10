create extension if not exists citext;

alter table public.profiles add column if not exists auth_provider text;
alter table public.profiles add column if not exists profile_completed_at timestamptz;

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

grant execute on function public.ensure_current_user_profile() to authenticated;
grant execute on function public.complete_current_profile(text, text) to authenticated;
