-- Run this in Supabase SQL Editor if login fails with:
-- "permission denied for table profiles".
-- It is intentionally idempotent and only restores client-safe grants.

grant usage on schema public to anon, authenticated;

grant select on table public.app_admin_emails to authenticated;
grant select, update on table public.profiles to authenticated;
grant select, update on table public.subscriptions to authenticated;
grant select, update on table public.devices to authenticated;
grant select, insert on table public.audit_logs to authenticated;

do $$
begin
  if to_regprocedure('public.is_admin()') is not null then
    execute 'grant execute on function public.is_admin() to authenticated';
  end if;

  if to_regprocedure('public.ensure_current_user_profile()') is not null then
    execute 'grant execute on function public.ensure_current_user_profile() to authenticated';
  end if;

  if to_regprocedure('public.touch_current_profile()') is not null then
    execute 'grant execute on function public.touch_current_profile() to authenticated';
  end if;

  if to_regprocedure('public.claim_current_device(text,text)') is not null then
    execute 'grant execute on function public.claim_current_device(text, text) to authenticated';
  end if;

  if to_regprocedure('public.claim_current_device(text,text,text[])') is not null then
    execute 'grant execute on function public.claim_current_device(text, text, text[]) to authenticated';
  end if;

  if to_regprocedure('public.complete_current_profile(text,text)') is not null then
    execute 'grant execute on function public.complete_current_profile(text, text) to authenticated';
  end if;
end $$;
