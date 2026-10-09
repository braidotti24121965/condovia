-- P8.2: maintenance requests for common areas only.
begin;

create table public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  request_number bigint not null,
  structure_id uuid not null,
  equipment_id uuid,
  title text not null check (length(btrim(title)) between 3 and 180),
  description text not null check (length(btrim(description)) between 3 and 10000),
  priority text not null check (priority in ('low','medium','high','emergency')),
  status text not null default 'pending_review' check (status in ('pending_review','approved','rejected')),
  requester_person_id uuid not null references public.people(id) on delete restrict,
  opened_at timestamptz not null default now(),
  analyzed_at timestamptz,
  analyzed_by_user_account_id uuid references public.user_accounts(id) on delete set null,
  rejection_reason text check (rejection_reason is null or length(btrim(rejection_reason)) between 3 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (condominium_id, request_number),
  unique (id, condominium_id),
  foreign key (structure_id, condominium_id) references public.condominium_structures(id, condominium_id) on delete restrict,
  foreign key (equipment_id, condominium_id) references public.maintenance_equipment(id, condominium_id) on delete restrict,
  check ((status = 'rejected') = (rejection_reason is not null)),
  check ((status = 'pending_review') = (analyzed_at is null and analyzed_by_user_account_id is null and rejection_reason is null)),
  check (status <> 'approved' or rejection_reason is null)
);

create table public.maintenance_request_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.maintenance_requests(id) on delete restrict,
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  event_type text not null check (event_type in ('created','approved','rejected')),
  previous_status text,
  new_status text not null,
  reason text,
  actor_user_account_id uuid references public.user_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (request_id, condominium_id) references public.maintenance_requests(id, condominium_id)
);

create index maintenance_requests_scope_idx on public.maintenance_requests(condominium_id, status, priority, created_at desc);
create index maintenance_requests_structure_idx on public.maintenance_requests(condominium_id, structure_id, created_at desc);
create index maintenance_requests_requester_idx on public.maintenance_requests(requester_person_id, created_at desc);
create index maintenance_request_history_request_idx on public.maintenance_request_history(request_id, created_at);

alter table public.audit_events drop constraint if exists audit_events_entity_type_check;
alter table public.audit_events add constraint audit_events_entity_type_check check (entity_type in (
  'user_invitation','condominium_membership','administrator_membership','administrator_condominium_access',
  'platform_membership','role_assignment','permission_override','user_account','access_authorization',
  'access_event','access_request','address','condominium','condominium_structure','package','person',
  'person_condominium_link','person_email','person_phone','platform_acting_context','unit','unit_occupancy',
  'unit_ownership','maintenance_equipment','maintenance_equipment_category','maintenance_settings',
  'maintenance_request','maintenance_request_history','visitor','service_provider','access_point','package_collection',
  'person_document','unit_financial_responsibility'
));

create or replace function public.guard_maintenance_request()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.title := btrim(new.title);
  new.description := btrim(new.description);
  if new.status <> 'pending_review' and new.analyzed_at is null then
    new.analyzed_at := now();
  end if;
  if new.equipment_id is not null and not exists (
    select 1 from public.maintenance_equipment e
    where e.id = new.equipment_id and e.condominium_id = new.condominium_id
      and e.structure_id = new.structure_id and e.status = 'active'
  ) then raise exception 'Equipment is inactive, outside condominium or outside structure' using errcode = '23514'; end if;
  if not exists (select 1 from public.condominium_structures s where s.id = new.structure_id and s.condominium_id = new.condominium_id and s.status = 'active') then
    raise exception 'Maintenance requests require an active common area structure' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and (new.condominium_id is distinct from old.condominium_id or new.requester_person_id is distinct from old.requester_person_id) then
    raise exception 'Maintenance request tenant and requester cannot be changed' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger maintenance_request_guard before insert or update on public.maintenance_requests
for each row execute function public.guard_maintenance_request();
create trigger maintenance_requests_set_updated_at before update on public.maintenance_requests
for each row execute function public.set_updated_at();

create or replace function public.audit_maintenance_request_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare entity_name text; entity_id uuid; condo_id uuid; current_status text;
begin
  if tg_table_name = 'maintenance_requests' then
    entity_name := 'maintenance_request';
    entity_id := case when tg_op = 'DELETE' then old.id else new.id end;
    condo_id := case when tg_op = 'DELETE' then old.condominium_id else new.condominium_id end;
    current_status := case when tg_op = 'DELETE' then old.status else new.status end;
  else
    entity_name := 'maintenance_request_history';
    entity_id := case when tg_op = 'DELETE' then old.request_id else new.request_id end;
    condo_id := case when tg_op = 'DELETE' then old.condominium_id else new.condominium_id end;
    current_status := case when tg_op = 'DELETE' then old.new_status else new.new_status end;
  end if;
  insert into public.audit_events(actor_auth_user_id, actor_user_account_id, event_type, entity_type, entity_id, metadata)
  values (auth.uid(), public.current_user_account_id(), 'maintenance.' || lower(tg_op), entity_name, entity_id,
    jsonb_build_object('operation', tg_op, 'condominium_id', condo_id, 'status', current_status));
  return coalesce(new, old);
end $$;

create trigger maintenance_requests_audit after insert or update on public.maintenance_requests
for each row execute function public.audit_maintenance_request_change();
create trigger maintenance_request_history_audit after insert on public.maintenance_request_history
for each row execute function public.audit_maintenance_request_change();

create or replace function public.emit_maintenance_request_notification(p_request_id uuid, p_type text, p_title text, p_message text)
returns void language plpgsql security definer set search_path = public as $$
declare v public.maintenance_requests%rowtype; v_requester uuid;
begin
  select * into v from public.maintenance_requests where id = p_request_id;
  if v.id is null then return; end if;
  select ua.id into v_requester from public.user_accounts ua where ua.person_id = v.requester_person_id and ua.status = 'active' limit 1;
  if v_requester is not null then
    insert into public.notifications(condominium_id, recipient_user_account_id, notification_type, title, message, entity_type, entity_id)
    values (v.condominium_id, v_requester, p_type, p_title, p_message, 'maintenance_request', v.id) on conflict do nothing;
  end if;
  insert into public.notifications(condominium_id, recipient_user_account_id, notification_type, title, message, entity_type, entity_id)
  select v.condominium_id, ua.id, p_type, p_title, p_message, 'maintenance_request', v.id
  from public.user_accounts ua
  join public.role_assignments ra on ra.user_account_id = ua.id and ra.condominium_id = v.condominium_id and ra.status = 'active'
  join public.roles r on r.id = ra.role_id and r.code in ('condominium.syndic','condominium.manager') and r.status = 'active'
  where ua.status = 'active' and ua.id is distinct from v_requester on conflict do nothing;
end $$;

create or replace function public.create_maintenance_request(p_structure_id uuid, p_equipment_id uuid, p_title text, p_description text, p_priority text default 'medium')
returns table(id uuid, request_number bigint, status text)
language plpgsql security definer set search_path = public as $$
declare v_account uuid := public.current_user_account_id(); v_person uuid := public.current_person_id(); v_condo uuid; v_number bigint; v_enabled boolean;
begin
  if v_account is null or v_person is null then raise exception 'Acesso não autenticado' using errcode = '42501'; end if;
  select s.condominium_id into v_condo from public.condominium_structures s where s.id = p_structure_id and s.status = 'active';
  if v_condo is null or not public.has_permission('maintenance.requests.create', v_condo) then raise exception 'Permissão negada' using errcode = '42501'; end if;
  if exists (select 1 from public.role_assignments ra join public.roles r on r.id = ra.role_id where ra.user_account_id = v_account and ra.condominium_id = v_condo and ra.status = 'active' and r.code in ('condominium.resident','condominium.resident_owner','condominium.resident_tenant')) then
    select coalesce(ms.resident_requests_enabled, false) into v_enabled from public.maintenance_settings ms where ms.condominium_id = v_condo;
    if not coalesce(v_enabled, false) then raise exception 'Resident maintenance requests are disabled' using errcode = '42501'; end if;
  end if;
  if p_priority not in ('low','medium','high','emergency') then raise exception 'Prioridade inválida' using errcode = '23514'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_condo::text, 62002));
  select coalesce(max(r.request_number),0)+1 into v_number from public.maintenance_requests r where r.condominium_id = v_condo;
  insert into public.maintenance_requests(condominium_id,request_number,structure_id,equipment_id,title,description,priority,requester_person_id)
  values(v_condo,v_number,p_structure_id,p_equipment_id,p_title,p_description,p_priority,v_person)
  returning maintenance_requests.id, maintenance_requests.request_number, maintenance_requests.status into id, request_number, status;
  insert into public.maintenance_request_history(request_id,condominium_id,event_type,new_status,actor_user_account_id) values(id,v_condo,'created','pending_review',v_account);
  perform public.emit_maintenance_request_notification(id, case when p_priority = 'emergency' then 'maintenance_request_emergency' else 'maintenance_request_created' end, case when p_priority = 'emergency' then 'Solicitação emergencial' else 'Nova solicitação de manutenção' end, case when p_priority = 'emergency' then 'Uma solicitação emergencial foi registrada.' else 'Uma nova solicitação de manutenção aguarda análise.' end);
  return next;
end $$;

create or replace function public.decide_maintenance_request(p_request_id uuid, p_decision text, p_rejection_reason text default null)
returns public.maintenance_requests language plpgsql security definer set search_path = public as $$
declare v public.maintenance_requests%rowtype; v_account uuid := public.current_user_account_id(); v_status text;
begin
  select * into v from public.maintenance_requests where id = p_request_id for update;
  if v.id is null or not public.has_permission('maintenance.requests.decide', v.condominium_id) then raise exception 'Permissão negada' using errcode = '42501'; end if;
  if v.status <> 'pending_review' then raise exception 'Transição inválida' using errcode = '23514'; end if;
  if p_decision not in ('approve','reject') then raise exception 'Decisão inválida' using errcode = '23514'; end if;
  if p_decision = 'reject' and length(btrim(coalesce(p_rejection_reason,''))) < 3 then raise exception 'Motivo de rejeição obrigatório' using errcode = '23514'; end if;
  v_status := case when p_decision = 'approve' then 'approved' else 'rejected' end;
  update public.maintenance_requests set status=v_status, analyzed_at=now(), analyzed_by_user_account_id=v_account, rejection_reason=case when p_decision='reject' then btrim(p_rejection_reason) else null end where id=v.id returning * into v;
  insert into public.maintenance_request_history(request_id,condominium_id,event_type,previous_status,new_status,reason,actor_user_account_id) values(v.id,v.condominium_id,case when p_decision='approve' then 'approved' else 'rejected' end,'pending_review',v.status,v.rejection_reason,v_account);
  perform public.emit_maintenance_request_notification(v.id, case when p_decision='approve' then 'maintenance_request_approved' else 'maintenance_request_rejected' end, case when p_decision='approve' then 'Solicitação aprovada' else 'Solicitação rejeitada' end, case when p_decision='approve' then 'Sua solicitação de manutenção foi aprovada.' else 'Sua solicitação de manutenção foi rejeitada: ' || v.rejection_reason end);
  return v;
end $$;

alter table public.maintenance_requests enable row level security;
alter table public.maintenance_request_history enable row level security;
grant select on public.maintenance_requests, public.maintenance_request_history to authenticated;
create policy maintenance_requests_read on public.maintenance_requests for select to authenticated using (public.has_permission('maintenance.requests.read', condominium_id) or requester_person_id = public.current_person_id());
create policy maintenance_requests_insert on public.maintenance_requests for insert to authenticated with check (public.has_permission('maintenance.requests.create', condominium_id) and requester_person_id = public.current_person_id());
create policy maintenance_requests_update on public.maintenance_requests for update to authenticated using (public.has_permission('maintenance.requests.decide', condominium_id)) with check (public.has_permission('maintenance.requests.decide', condominium_id));
create policy maintenance_request_history_read on public.maintenance_request_history for select to authenticated using (exists (select 1 from public.maintenance_requests r where r.id = request_id and (public.has_permission('maintenance.requests.read', r.condominium_id) or r.requester_person_id = public.current_person_id())));

revoke all on function public.guard_maintenance_request() from public, anon, authenticated;
revoke all on function public.audit_maintenance_request_change() from public, anon, authenticated;
revoke all on function public.emit_maintenance_request_notification(uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.create_maintenance_request(uuid,uuid,text,text,text) from public, anon;
revoke all on function public.decide_maintenance_request(uuid,text,text) from public, anon;
grant execute on function public.create_maintenance_request(uuid,uuid,text,text,text) to authenticated;
grant execute on function public.decide_maintenance_request(uuid,text,text) to authenticated;

insert into public.permissions(code, description, scope) values
  ('maintenance.requests.read','Consultar solicitações de manutenção','condominium'),
  ('maintenance.requests.create','Registrar solicitações de manutenção','condominium'),
  ('maintenance.requests.decide','Analisar solicitações de manutenção','condominium')
on conflict (code) do nothing;
insert into public.role_permissions(role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code in ('condominium.syndic','condominium.manager') and p.code in ('maintenance.requests.read','maintenance.requests.create','maintenance.requests.decide') on conflict do nothing;
insert into public.role_permissions(role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code = 'condominium.doorman' and p.code in ('maintenance.requests.read','maintenance.requests.create') on conflict do nothing;
insert into public.role_permissions(role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code in ('condominium.resident','condominium.resident_owner','condominium.resident_tenant') and p.code = 'maintenance.requests.create' on conflict do nothing;

alter table public.notifications drop constraint if exists notifications_notification_type_check;
alter table public.notifications add constraint notifications_notification_type_check check (notification_type in (
  'reservation_requested','reservation_approved','reservation_rejected','reservation_cancelled',
  'occurrence_created','occurrence_assigned','occurrence_commented','occurrence_status_changed','occurrence_resolved','occurrence_reopened','occurrence_closed','occurrence_cancelled',
  'maintenance_request_created','maintenance_request_emergency','maintenance_request_approved','maintenance_request_rejected'
));

commit;
