create or replace function public.claim_current_device(p_device_fingerprint text, p_device_name text)
returns table(ok boolean, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  active_other_count integer;
  device_limit integer;
begin
  if auth.uid() is null then
    return query select false, 'not_authenticated';
    return;
  end if;

  select case when role = 'admin' then 2 else 1 end
    into device_limit
  from public.profiles
  where id = auth.uid()
    and status = 'active';

  device_limit := coalesce(device_limit, 1);

  select count(*)
    into active_other_count
  from public.devices
  where user_id = auth.uid()
    and revoked_at is null
    and device_fingerprint <> p_device_fingerprint;

  if active_other_count >= device_limit then
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

grant execute on function public.claim_current_device(text, text) to authenticated;
