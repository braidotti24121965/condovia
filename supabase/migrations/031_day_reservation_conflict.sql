-- P5.4.14: DAY ocupa a data civil inteira e não usa buffer horário.
create or replace function public.prevent_reservation_buffer_conflict()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resource_buffer integer;
  resource_mode text;
  condominium_timezone text;
begin
  if new.status not in ('pending', 'approved') then return new; end if;

  perform pg_advisory_xact_lock(hashtextextended(new.resource_id::text, 29401));

  select coalesce(buffer_minutes, 0), reservation_mode, c.timezone
    into resource_buffer, resource_mode, condominium_timezone
  from public.reservable_resources rr
  join public.condominiums c on c.id = rr.condominium_id
  where rr.id = new.resource_id and rr.condominium_id = new.condominium_id;

  if resource_mode = 'day' then
    if exists (
      select 1
      from public.reservations r
      where r.id <> new.id
        and r.resource_id = new.resource_id
        and r.condominium_id = new.condominium_id
        and r.status in ('pending', 'approved')
        and (r.starts_at at time zone coalesce(condominium_timezone, 'America/Sao_Paulo'))::date
            = (new.starts_at at time zone coalesce(condominium_timezone, 'America/Sao_Paulo'))::date
    ) then
      raise exception 'Já existe uma reserva nesse período' using errcode = '23P01';
    end if;
    return new;
  end if;

  if exists (
    select 1
    from public.reservations r
    where r.id <> new.id
      and r.resource_id = new.resource_id
      and r.condominium_id = new.condominium_id
      and r.status in ('pending', 'approved')
      and tstzrange(r.starts_at - make_interval(mins => resource_buffer), r.ends_at + make_interval(mins => resource_buffer), '[)')
          && tstzrange(new.starts_at, new.ends_at, '[)')
  ) then
    raise exception 'Já existe uma reserva nesse período' using errcode = '23P01';
  end if;
  return new;
end;
$$;
