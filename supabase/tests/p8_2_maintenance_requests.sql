begin;

do $$
declare
  client_id uuid;
  condo_id uuid;
  other_condo_id uuid;
  structure_id uuid;
  other_structure_id uuid;
  equipment_id uuid;
  person_id uuid;
  v_request_id uuid;
  request_status text;
begin
  insert into public.clients(legal_name) values ('P8.2 Test Client') returning id into client_id;
  insert into public.condominiums(client_id, name) values (client_id, 'P8.2 Test Condominium') returning id into condo_id;
  insert into public.condominiums(client_id, name) values (client_id, 'P8.2 Other Condominium') returning id into other_condo_id;
  insert into public.condominium_structures(condominium_id, structure_type, name) values (condo_id, 'building', 'P8.2 Common Area') returning id into structure_id;
  insert into public.condominium_structures(condominium_id, structure_type, name) values (other_condo_id, 'building', 'P8.2 Other Area') returning id into other_structure_id;
  insert into public.maintenance_equipment(condominium_id, structure_id, identification, status) values (condo_id, structure_id, 'P8.2 Eligible Equipment', 'active') returning id into equipment_id;
  insert into public.people(full_name) values ('P8.2 Test Requester') returning id into person_id;

  if not exists (select 1 from pg_constraint where conrelid = 'public.maintenance_requests'::regclass and contype = 'u' and pg_get_constraintdef(oid) like '%request_number%') then raise exception 'request number uniqueness missing'; end if;
  if not exists (select 1 from public.permissions where code = 'maintenance.requests.decide') then raise exception 'decision permission missing'; end if;
  if not exists (select 1 from pg_policies where tablename = 'maintenance_requests' and policyname = 'maintenance_requests_read') then raise exception 'request RLS policy missing'; end if;

  begin
    insert into public.maintenance_requests(condominium_id, request_number, structure_id, equipment_id, title, description, priority, requester_person_id)
    values (condo_id, 1, other_structure_id, equipment_id, 'Cross tenant', 'Must be blocked', 'high', person_id);
    raise exception 'cross-tenant structure/equipment link accepted';
  exception when foreign_key_violation or check_violation then null;
  end;

  insert into public.maintenance_requests(condominium_id, request_number, structure_id, equipment_id, title, description, priority, requester_person_id)
  values (condo_id, 2, structure_id, equipment_id, 'Valid request', 'Common area issue', 'emergency', person_id) returning id, status into v_request_id, request_status;
  if request_status <> 'pending_review' then raise exception 'request did not start pending_review'; end if;
  insert into public.maintenance_request_history(request_id, condominium_id, event_type, new_status) values (v_request_id, condo_id, 'created', 'pending_review');
  if not exists (select 1 from public.maintenance_request_history h where h.request_id = v_request_id and h.new_status = 'pending_review') then raise exception 'history was not preserved'; end if;

  begin
    update public.maintenance_requests set status = 'rejected' where id = v_request_id;
    raise exception 'rejection without reason accepted';
  exception when check_violation then null;
  end;

  if exists (select 1 from pg_class where relname = 'maintenance_orders') then raise exception 'P8.3 order table unexpectedly created'; end if;
end $$;

rollback;
