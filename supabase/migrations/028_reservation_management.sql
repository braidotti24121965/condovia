-- P5.3: transições administrativas e histórico de reservas.
alter table public.reservations add constraint reservations_id_condominium_unique unique (id, condominium_id);

create table public.reservation_status_history (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete restrict,
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  previous_status text not null,
  new_status text not null,
  reason text,
  changed_by_user_account_id uuid references public.user_accounts(id) on delete set null,
  changed_at timestamptz not null default now(),
  foreign key (reservation_id, condominium_id) references public.reservations(id, condominium_id) on delete restrict
);

insert into public.permissions (code, description, scope) values
  ('reservations.manage', 'Aprovar, rejeitar e cancelar reservas', 'condominium'),
  ('reservations.cancel', 'Cancelar reservas próprias permitidas', 'condominium')
on conflict (code) do update set description = excluded.description, scope = excluded.scope;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code in ('condominium.syndic','condominium.manager') and p.code = 'reservations.manage'
on conflict do nothing;
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code in ('condominium.resident','condominium.resident_owner','condominium.resident_tenant') and p.code = 'reservations.cancel'
on conflict do nothing;

alter table public.reservation_status_history enable row level security;
revoke all on public.reservation_status_history from public, anon, authenticated;
grant select on public.reservation_status_history to authenticated;
create policy reservation_status_history_read on public.reservation_status_history for select to authenticated
using (has_permission('reservations.read', condominium_id));
revoke update on public.reservations from authenticated;

create or replace function public.manage_reservation(p_reservation_id uuid, p_action text, p_reason text default null)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  current_res public.reservations;
  old_status text;
  next_status text;
  actor uuid := public.current_user_account_id();
  can_manage boolean;
  can_cancel boolean;
begin
  select * into current_res from public.reservations where id = p_reservation_id for update;
  if current_res.id is null then raise exception 'Reserva não encontrada' using errcode = 'P0002'; end if;
  can_manage := public.has_permission('reservations.manage', current_res.condominium_id);
  can_cancel := public.has_permission('reservations.cancel', current_res.condominium_id) and current_res.requester_person_id = public.current_person_id();
  if p_action in ('approve','reject') and not can_manage then raise exception 'Usuário não autorizado' using errcode = '42501'; end if;
  if p_action = 'cancel' and not (can_manage or can_cancel) then raise exception 'Usuário não autorizado' using errcode = '42501'; end if;
  if p_action = 'approve' then next_status := 'approved'; elsif p_action = 'reject' then next_status := 'rejected'; elsif p_action = 'cancel' then next_status := 'cancelled'; else raise exception 'Ação de reserva inválida' using errcode = '22023'; end if;
  old_status := current_res.status;
  if p_action in ('approve','reject') and current_res.status <> 'pending' then raise exception 'Transição de reserva inválida' using errcode = '23514'; end if;
  if p_action = 'reject' and nullif(btrim(p_reason),'') is null then raise exception 'Motivo da rejeição é obrigatório' using errcode = '22023'; end if;
  if p_action = 'cancel' and current_res.status not in ('pending','approved') then raise exception 'Transição de reserva inválida' using errcode = '23514'; end if;
  if p_action = 'cancel' and not can_manage and (not exists (select 1 from public.reservable_resources r where r.id=current_res.resource_id and r.cancellation_allowed) or now() > current_res.starts_at - make_interval(mins => (select cancellation_deadline_minutes from public.reservable_resources where id=current_res.resource_id))) then raise exception 'O prazo de cancelamento foi encerrado' using errcode = '23514'; end if;
  if p_action = 'approve' and exists (select 1 from public.reservations r where r.id <> current_res.id and r.resource_id=current_res.resource_id and r.status='approved' and tstzrange(r.starts_at,r.ends_at,'[)') && tstzrange(current_res.starts_at,current_res.ends_at,'[)')) then raise exception 'Já existe uma reserva nesse período' using errcode = '23P01'; end if;
  update public.reservations set status=next_status, updated_at=now() where id=current_res.id returning * into current_res;
  insert into public.reservation_status_history(reservation_id,condominium_id,previous_status,new_status,reason,changed_by_user_account_id) values (current_res.id,current_res.condominium_id,old_status,next_status,nullif(btrim(p_reason),''),actor);
  return current_res;
end;
$$;
revoke all on function public.manage_reservation(uuid,text,text) from public, anon;
grant execute on function public.manage_reservation(uuid,text,text) to authenticated;
