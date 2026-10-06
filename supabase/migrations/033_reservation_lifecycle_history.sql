-- P5.5.2: snapshot de modalidade e auditoria da solicitação.
alter table public.reservations
  add column if not exists reservation_mode text
  check (reservation_mode is null or reservation_mode in ('day', 'time_slot'));

create or replace function public.record_reservation_creation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.reservation_status_history
    (reservation_id, condominium_id, previous_status, new_status, reason, changed_by_user_account_id)
  values
    (new.id, new.condominium_id, 'created', new.status, null, current_user_account_id());
  return new;
end;
$$;

revoke all on function public.record_reservation_creation() from public, anon, authenticated;
create trigger reservations_creation_history
after insert on public.reservations
for each row execute function public.record_reservation_creation();
