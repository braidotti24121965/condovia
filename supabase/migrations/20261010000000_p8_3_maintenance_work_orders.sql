-- P8.3: controlled work orders for common-area maintenance.
begin;

alter table public.service_providers
  add constraint service_providers_id_condominium_key unique (id, condominium_id);

create table public.maintenance_work_orders (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  work_order_number bigint not null,
  maintenance_request_id uuid,
  structure_id uuid not null,
  equipment_id uuid,
  description text not null check (length(btrim(description)) between 3 and 10000),
  priority text not null check (priority in ('low','medium','high','emergency')),
  origin text not null check (origin in ('maintenance_request','direct')),
  status text not null default 'open' check (status in ('open','assigned','in_progress','awaiting_validation','completed','cancelled')),
  responsible_user_account_id uuid references public.user_accounts(id) on delete set null,
  service_provider_id uuid references public.service_providers(id) on delete set null,
  due_at date,
  started_at timestamptz,
  activity_notes text,
  observations text,
  technical_conclusion text,
  completed_at timestamptz,
  validated_at timestamptz,
  validated_by_user_account_id uuid references public.user_accounts(id) on delete set null,
  cancellation_reason text,
  cancelled_at timestamptz,
  cancelled_by_user_account_id uuid references public.user_accounts(id) on delete set null,
  created_by_user_account_id uuid not null references public.user_accounts(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (condominium_id, work_order_number),
  unique (id, condominium_id),
  unique (maintenance_request_id),
  foreign key (structure_id, condominium_id) references public.condominium_structures(id, condominium_id) on delete restrict,
  foreign key (equipment_id, condominium_id) references public.maintenance_equipment(id, condominium_id) on delete restrict,
  foreign key (maintenance_request_id, condominium_id) references public.maintenance_requests(id, condominium_id) on delete restrict,
  foreign key (service_provider_id, condominium_id) references public.service_providers(id, condominium_id) on delete restrict,
  check ((status = 'cancelled') = (cancellation_reason is not null and cancelled_at is not null)),
  check ((status = 'completed') = (completed_at is not null and validated_at is not null and validated_by_user_account_id is not null)),
  check (origin = 'maintenance_request' or maintenance_request_id is null)
);

create table public.maintenance_work_order_participants (
  work_order_id uuid not null references public.maintenance_work_orders(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  user_account_id uuid not null references public.user_accounts(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (work_order_id, user_account_id),
  foreign key (work_order_id, condominium_id) references public.maintenance_work_orders(id, condominium_id) on delete cascade
);

create table public.maintenance_work_order_history (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.maintenance_work_orders(id) on delete restrict,
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  event_type text not null check (event_type in ('created','assigned','started','submitted_for_validation','validated','cancelled','activity_updated')),
  previous_status text,
  new_status text,
  reason text,
  actor_user_account_id uuid references public.user_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (work_order_id, condominium_id) references public.maintenance_work_orders(id, condominium_id) on delete restrict
);

create index maintenance_work_orders_scope_idx on public.maintenance_work_orders(condominium_id, status, priority, created_at desc);
create index maintenance_work_orders_structure_idx on public.maintenance_work_orders(condominium_id, structure_id, created_at desc);
create index maintenance_work_order_history_idx on public.maintenance_work_order_history(work_order_id, created_at);
create index maintenance_work_order_participants_user_idx on public.maintenance_work_order_participants(condominium_id, user_account_id);

alter table public.audit_events drop constraint if exists audit_events_entity_type_check;
alter table public.audit_events add constraint audit_events_entity_type_check check (entity_type in (
  'user_invitation','condominium_membership','administrator_membership','administrator_condominium_access',
  'platform_membership','role_assignment','permission_override','user_account','access_authorization',
  'access_event','access_request','address','condominium','condominium_structure','package','person',
  'person_condominium_link','person_email','person_phone','platform_acting_context','unit','unit_occupancy',
  'unit_ownership','maintenance_equipment','maintenance_equipment_category','maintenance_settings',
  'maintenance_request','maintenance_request_history','maintenance_work_order','maintenance_work_order_history',
  'visitor','service_provider','access_point','package_collection','person_document','unit_financial_responsibility'
));

create or replace function public.guard_maintenance_work_order()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.description := btrim(new.description);
  if new.status = 'cancelled' and length(btrim(coalesce(new.cancellation_reason, ''))) < 3 then
    raise exception 'Motivo de cancelamento obrigatório' using errcode = '23514';
  end if;
  if new.equipment_id is not null and not exists (
    select 1 from public.maintenance_equipment e
     where e.id = new.equipment_id and e.condominium_id = new.condominium_id
       and e.structure_id = new.structure_id and e.status = 'active'
  ) then raise exception 'Equipment is inactive, outside condominium or outside structure' using errcode = '23514'; end if;
  if not exists (select 1 from public.condominium_structures s where s.id = new.structure_id and s.condominium_id = new.condominium_id and s.status = 'active') then
    raise exception 'Work orders require an active common area structure' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger maintenance_work_order_guard before insert or update on public.maintenance_work_orders
for each row execute function public.guard_maintenance_work_order();
create trigger maintenance_work_orders_set_updated_at before update on public.maintenance_work_orders
for each row execute function public.set_updated_at();

create or replace function public.audit_maintenance_work_order_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_entity text; v_id uuid; v_condo uuid; v_old text; v_new text;
begin
  if tg_table_name = 'maintenance_work_orders' then
    v_entity := 'maintenance_work_order';
    if tg_op = 'DELETE' then v_id := old.id; v_condo := old.condominium_id; v_old := old.status;
    else v_id := new.id; v_condo := new.condominium_id; v_new := new.status; if tg_op = 'UPDATE' then v_old := old.status; end if; end if;
  else
    v_entity := 'maintenance_work_order_history';
    if tg_op = 'DELETE' then v_id := old.work_order_id; v_condo := old.condominium_id; v_old := old.previous_status; v_new := old.new_status;
    else v_id := new.work_order_id; v_condo := new.condominium_id; v_old := new.previous_status; v_new := new.new_status; end if;
  end if;
  insert into public.audit_events(actor_auth_user_id, actor_user_account_id, event_type, entity_type, entity_id, metadata)
  values (auth.uid(), public.current_user_account_id(), 'maintenance.' || lower(tg_op), v_entity, v_id,
    jsonb_build_object('operation', tg_op, 'condominium_id', v_condo, 'old_status', v_old, 'new_status', v_new));
  return coalesce(new, old);
end $$;

create trigger maintenance_work_orders_audit after insert or update on public.maintenance_work_orders
for each row execute function public.audit_maintenance_work_order_change();
create trigger maintenance_work_order_history_audit after insert on public.maintenance_work_order_history
for each row execute function public.audit_maintenance_work_order_change();

create or replace function public.emit_maintenance_work_order_notification(p_work_order_id uuid, p_type text, p_title text, p_message text)
returns void language plpgsql security definer set search_path = public as $$
declare v public.maintenance_work_orders%rowtype;
begin
  select * into v from public.maintenance_work_orders where id = p_work_order_id;
  if v.id is null then return; end if;
  if v.responsible_user_account_id is not null then
    insert into public.notifications(condominium_id, recipient_user_account_id, notification_type, title, message, entity_type, entity_id)
    values (v.condominium_id, v.responsible_user_account_id, p_type, p_title, p_message, 'maintenance_work_order', v.id) on conflict do nothing;
  end if;
  insert into public.notifications(condominium_id, recipient_user_account_id, notification_type, title, message, entity_type, entity_id)
  select v.condominium_id, ua.id, p_type, p_title, p_message, 'maintenance_work_order', v.id
    from public.user_accounts ua
    join public.role_assignments ra on ra.user_account_id = ua.id and ra.condominium_id = v.condominium_id and ra.status = 'active'
    join public.roles r on r.id = ra.role_id and r.code in ('condominium.syndic','condominium.manager') and r.status = 'active'
   where ua.status = 'active' and ua.id is distinct from v.responsible_user_account_id on conflict do nothing;
end $$;

create or replace function public.create_maintenance_work_order(
  p_maintenance_request_id uuid default null,
  p_structure_id uuid default null,
  p_equipment_id uuid default null,
  p_description text default null,
  p_priority text default null,
  p_responsible_user_account_id uuid default null,
  p_service_provider_id uuid default null,
  p_due_at date default null
)
returns table(id uuid, work_order_number bigint, status text)
language plpgsql security definer set search_path = public as $$
declare v_account uuid := public.current_user_account_id(); v_condo uuid; v_request public.maintenance_requests%rowtype; v_number bigint; v_priority text; v_structure uuid; v_equipment uuid;
begin
  if v_account is null then raise exception 'Acesso não autenticado' using errcode = '42501'; end if;
  if p_maintenance_request_id is not null then
    select mr.* into v_request from public.maintenance_requests mr where mr.id = p_maintenance_request_id for share;
    if v_request.id is null or v_request.status <> 'approved' then raise exception 'Somente solicitações aprovadas podem originar uma OS' using errcode = '23514'; end if;
    v_condo := v_request.condominium_id; v_structure := v_request.structure_id; v_equipment := v_request.equipment_id; v_priority := v_request.priority;
    if exists (select 1 from public.maintenance_work_orders where maintenance_request_id = v_request.id) then raise exception 'A solicitação já possui uma OS' using errcode = '23505'; end if;
  else
    v_structure := p_structure_id; v_equipment := p_equipment_id; v_priority := coalesce(p_priority, 'medium');
    select s.condominium_id into v_condo from public.condominium_structures s where s.id = v_structure and s.status = 'active';
  end if;
  if v_condo is null or not public.has_permission('maintenance.orders.create', v_condo) then raise exception 'Permissão negada' using errcode = '42501'; end if;
  if v_structure is null or not exists (select 1 from public.condominium_structures s where s.id = v_structure and s.condominium_id = v_condo and s.status = 'active') then raise exception 'Estrutura inválida' using errcode = '23514'; end if;
  if v_equipment is not null and not exists (select 1 from public.maintenance_equipment e where e.id = v_equipment and e.condominium_id = v_condo and e.structure_id = v_structure and e.status = 'active') then raise exception 'Equipamento inválido' using errcode = '23514'; end if;
  if v_priority not in ('low','medium','high','emergency') then raise exception 'Prioridade inválida' using errcode = '23514'; end if;
  if p_responsible_user_account_id is not null and not exists (select 1 from public.user_accounts ua join public.role_assignments ra on ra.user_account_id = ua.id and ra.condominium_id = v_condo and ra.status = 'active' where ua.id = p_responsible_user_account_id and ua.status = 'active') then raise exception 'Responsável inválido para este condomínio' using errcode = '42501'; end if;
  if p_service_provider_id is not null and not exists (select 1 from public.service_providers sp where sp.id = p_service_provider_id and sp.condominium_id = v_condo and sp.status = 'active') then raise exception 'Prestador inválido' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_condo::text, 62003));
  select coalesce(max(w.work_order_number), 0) + 1 into v_number from public.maintenance_work_orders w where w.condominium_id = v_condo;
  insert into public.maintenance_work_orders(condominium_id,work_order_number,maintenance_request_id,structure_id,equipment_id,description,priority,origin,status,responsible_user_account_id,service_provider_id,due_at,created_by_user_account_id)
  values(v_condo,v_number,p_maintenance_request_id,v_structure,v_equipment,btrim(coalesce(p_description, v_request.description)),v_priority,case when p_maintenance_request_id is null then 'direct' else 'maintenance_request' end,case when p_responsible_user_account_id is null then 'open' else 'assigned' end,p_responsible_user_account_id,p_service_provider_id,p_due_at,v_account)
  returning maintenance_work_orders.id, maintenance_work_orders.work_order_number, maintenance_work_orders.status into id, work_order_number, status;
  insert into public.maintenance_work_order_history(work_order_id,condominium_id,event_type,new_status,actor_user_account_id) values(id,v_condo,'created',status,v_account);
  if p_responsible_user_account_id is not null then insert into public.maintenance_work_order_history(work_order_id,condominium_id,event_type,previous_status,new_status,actor_user_account_id) values(id,v_condo,'assigned','open','assigned',v_account); end if;
  perform public.emit_maintenance_work_order_notification(id, 'maintenance_work_order_created', 'Nova ordem de serviço', 'Uma ordem de serviço foi criada para sua gestão.');
  return next;
end $$;

create or replace function public.transition_maintenance_work_order(p_work_order_id uuid, p_action text, p_reason text default null, p_responsible_user_account_id uuid default null)
returns public.maintenance_work_orders language plpgsql security definer set search_path = public as $$
declare v public.maintenance_work_orders%rowtype; v_account uuid := public.current_user_account_id(); v_new text; v_event text; v_permission text; v_previous text;
begin
  select * into v from public.maintenance_work_orders where id = p_work_order_id for update;
  if v.id is null then raise exception 'OS inacessível' using errcode = '42501'; end if;
  v_permission := case when p_action in ('validate','cancel') then 'maintenance.orders.manage' when p_action = 'assign' then 'maintenance.orders.manage' else 'maintenance.orders.update' end;
  if not public.has_permission(v_permission, v.condominium_id) then raise exception 'Permissão negada' using errcode = '42501'; end if;
  v_previous := v.status;
  if p_action = 'assign' and v.status = 'open' and p_responsible_user_account_id is not null then
    if not exists (select 1 from public.user_accounts ua join public.role_assignments ra on ra.user_account_id=ua.id and ra.condominium_id=v.condominium_id and ra.status='active' where ua.id=p_responsible_user_account_id and ua.status='active') then raise exception 'Responsável inválido para este condomínio' using errcode='42501'; end if;
    v_new := 'assigned'; v_event := 'assigned';
  elsif p_action = 'start' and v.status = 'assigned' then v_new := 'in_progress'; v_event := 'started';
  elsif p_action = 'submit_validation' and v.status = 'in_progress' and length(btrim(coalesce(v.activity_notes,''))) >= 3 and length(btrim(coalesce(v.technical_conclusion,''))) >= 3 then v_new := 'awaiting_validation'; v_event := 'submitted_for_validation';
  elsif p_action = 'validate' and v.status = 'awaiting_validation' then v_new := 'completed'; v_event := 'validated';
  elsif p_action = 'cancel' and v.status in ('open','assigned','in_progress','awaiting_validation') and length(btrim(coalesce(p_reason,''))) >= 3 then v_new := 'cancelled'; v_event := 'cancelled';
  else raise exception 'Transição inválida ou motivo ausente' using errcode = '23514'; end if;
  update public.maintenance_work_orders set status=v_new, responsible_user_account_id=case when p_action='assign' then p_responsible_user_account_id else responsible_user_account_id end, started_at=case when v_new='in_progress' then coalesce(started_at,now()) else started_at end, completed_at=case when v_new='completed' then now() else completed_at end, validated_at=case when v_new='completed' then now() else validated_at end, validated_by_user_account_id=case when v_new='completed' then v_account else validated_by_user_account_id end, cancellation_reason=case when v_new='cancelled' then btrim(p_reason) else cancellation_reason end, cancelled_at=case when v_new='cancelled' then now() else cancelled_at end, cancelled_by_user_account_id=case when v_new='cancelled' then v_account else cancelled_by_user_account_id end where id=v.id returning * into v;
  insert into public.maintenance_work_order_history(work_order_id,condominium_id,event_type,previous_status,new_status,reason,actor_user_account_id) values(v.id,v.condominium_id,v_event,v_previous,v.status,p_reason,v_account);
  perform public.emit_maintenance_work_order_notification(v.id, 'maintenance_work_order_' || v_event, 'Atualização da ordem de serviço', 'A ordem de serviço foi atualizada.');
  return v;
end $$;

create or replace function public.update_maintenance_work_order_activity(p_work_order_id uuid, p_activity_notes text, p_observations text, p_technical_conclusion text default null)
returns public.maintenance_work_orders language plpgsql security definer set search_path = public as $$
declare v public.maintenance_work_orders%rowtype; a uuid := public.current_user_account_id();
begin
  select * into v from public.maintenance_work_orders where id=p_work_order_id for update;
  if v.id is null or not (public.has_permission('maintenance.orders.manage',v.condominium_id) or v.responsible_user_account_id=a or exists(select 1 from public.maintenance_work_order_participants p where p.work_order_id=v.id and p.user_account_id=a)) then raise exception 'Permissão negada' using errcode='42501'; end if;
  if v.status in ('completed','cancelled') then raise exception 'OS encerrada não pode ser alterada' using errcode='23514'; end if;
  update public.maintenance_work_orders set activity_notes=nullif(btrim(p_activity_notes),''), observations=nullif(btrim(p_observations),''), technical_conclusion=nullif(btrim(p_technical_conclusion),'') where id=v.id returning * into v;
  insert into public.maintenance_work_order_history(work_order_id,condominium_id,event_type,previous_status,new_status,reason,actor_user_account_id) values(v.id,v.condominium_id,'activity_updated',v.status,v.status,null,a);
  return v;
end $$;

alter table public.maintenance_work_orders enable row level security;
alter table public.maintenance_work_order_participants enable row level security;
alter table public.maintenance_work_order_history enable row level security;
grant select on public.maintenance_work_orders, public.maintenance_work_order_participants, public.maintenance_work_order_history to authenticated;
create policy maintenance_work_orders_read on public.maintenance_work_orders for select to authenticated using (public.has_permission('maintenance.orders.read', condominium_id) or responsible_user_account_id = public.current_user_account_id() or exists(select 1 from public.maintenance_work_order_participants p where p.work_order_id=id and p.user_account_id=public.current_user_account_id()));
create policy maintenance_work_order_participants_read on public.maintenance_work_order_participants for select to authenticated using (public.has_permission('maintenance.orders.read', condominium_id));
create policy maintenance_work_order_history_read on public.maintenance_work_order_history for select to authenticated using (public.has_permission('maintenance.orders.read', condominium_id));

revoke all on function public.guard_maintenance_work_order() from public, anon, authenticated;
revoke all on function public.audit_maintenance_work_order_change() from public, anon, authenticated;
revoke all on function public.emit_maintenance_work_order_notification(uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.create_maintenance_work_order(uuid,uuid,uuid,text,text,uuid,uuid,date) from public, anon;
revoke all on function public.transition_maintenance_work_order(uuid,text,text,uuid) from public, anon;
revoke all on function public.update_maintenance_work_order_activity(uuid,text,text,text) from public, anon;
grant execute on function public.create_maintenance_work_order(uuid,uuid,uuid,text,text,uuid,uuid,date) to authenticated;
grant execute on function public.transition_maintenance_work_order(uuid,text,text,uuid) to authenticated;
grant execute on function public.update_maintenance_work_order_activity(uuid,text,text,text) to authenticated;

insert into public.permissions(code, description, scope) values
 ('maintenance.orders.read','Consultar ordens de serviço','condominium'),
 ('maintenance.orders.create','Criar ordens de serviço','condominium'),
 ('maintenance.orders.update','Atualizar atividades de ordens de serviço','condominium'),
 ('maintenance.orders.manage','Gerenciar, atribuir, cancelar e validar ordens de serviço','condominium')
on conflict (code) do nothing;
insert into public.role_permissions(role_id, permission_id)
select r.id,p.id from public.roles r cross join public.permissions p where r.code in ('condominium.syndic','condominium.manager') and p.code like 'maintenance.orders.%' on conflict do nothing;
insert into public.role_permissions(role_id, permission_id)
select r.id,p.id from public.roles r cross join public.permissions p where r.code = 'condominium.doorman' and p.code = 'maintenance.orders.read' on conflict do nothing;

alter table public.notifications drop constraint if exists notifications_notification_type_check;
alter table public.notifications add constraint notifications_notification_type_check check (notification_type in (
  'reservation_requested','reservation_approved','reservation_rejected','reservation_cancelled',
  'occurrence_created','occurrence_assigned','occurrence_commented','occurrence_status_changed','occurrence_resolved','occurrence_reopened','occurrence_closed','occurrence_cancelled',
  'maintenance_request_created','maintenance_request_emergency','maintenance_request_approved','maintenance_request_rejected',
  'maintenance_work_order_created','maintenance_work_order_assigned','maintenance_work_order_started','maintenance_work_order_submitted_for_validation','maintenance_work_order_validated','maintenance_work_order_cancelled','maintenance_work_order_activity_updated'
));

commit;
