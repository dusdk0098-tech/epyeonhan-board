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

grant execute on function public.claim_current_device(text, text, text[]) to authenticated;
