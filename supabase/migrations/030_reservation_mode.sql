-- P5.4.10: modalidade de reserva. Recursos existentes permanecem por horário.
alter table public.reservable_resources
  add column if not exists reservation_mode text not null default 'time_slot'
  check (reservation_mode in ('day', 'time_slot'));
