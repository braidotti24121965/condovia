-- P5.4.2: buffer atômico e disponibilidade sanitizada.

create or replace function public.prevent_reservation_buffer_conflict()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  buffer_minutes integer;
begin
  if new.status not in ('pending', 'approved') then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended(new.resource_id::text, 29401));
  select coalesce(buffer_minutes, 0) into buffer_minutes
  from public.reservable_resources
  where id = new.resource_id and condominium_id = new.condominium_id;
  if exists (
    select 1
    from public.reservations r
    where r.id <> new.id
      and r.resource_id = new.resource_id
      and r.status in ('pending', 'approved')
      and tstzrange(r.starts_at - make_interval(mins => buffer_minutes), r.ends_at + make_interval(mins => buffer_minutes), '[)')
          && tstzrange(new.starts_at, new.ends_at, '[)')
  ) then
    raise exception 'Já existe uma reserva nesse período' using errcode = '23P01';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_reservation_buffer_conflict() from public, anon, authenticated;
create trigger reservations_buffer_guard
before insert or update on public.reservations
for each row execute function public.prevent_reservation_buffer_conflict();

create or replace function public.get_reservation_availability(
  p_resource_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns table(start_at timestamptz, end_at timestamptz, is_own_reservation boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select r.starts_at, r.ends_at,
    r.requester_person_id = public.current_person_id()
  from public.reservations r
  join public.reservable_resources rr on rr.id = r.resource_id and rr.condominium_id = r.condominium_id
  where r.resource_id = p_resource_id
    and r.starts_at < p_to
    and r.ends_at > p_from
    and r.status in ('pending', 'approved')
    and rr.status = 'active'
    and public.has_permission('reservations.resources.read', r.condominium_id);
$$;

revoke all on function public.get_reservation_availability(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.get_reservation_availability(uuid, timestamptz, timestamptz) to authenticated;
