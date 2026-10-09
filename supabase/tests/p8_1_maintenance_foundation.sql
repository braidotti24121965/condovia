begin;

-- Regression coverage for the P8.1 migration. This suite is intentionally
-- transactional and leaves no equipment or audit rows behind.
do $$
declare
  client_id uuid;
  condo_id uuid;
  structure_id uuid;
  equipment_id uuid;
  settings_audit_count integer;
  audit_type text;
begin
  insert into public.clients(legal_name) values ('P8.1 Test Client') returning id into client_id;
  insert into public.condominiums(client_id, name) values (client_id, 'P8.1 Test Condominium') returning id into condo_id;
  insert into public.condominium_structures(condominium_id, structure_type, name) values (condo_id, 'building', 'P8.1 Test Structure') returning id into structure_id;

  insert into public.maintenance_settings(condominium_id)
  values (condo_id);
  select count(*) into settings_audit_count
    from public.audit_events
   where entity_type = 'maintenance_settings'
     and entity_id = condo_id
     and event_type = 'maintenance.insert';
  if settings_audit_count <> 1 then raise exception 'maintenance_settings insert audit missing'; end if;

  update public.maintenance_settings as ms
     set resident_requests_enabled = true
   where ms.condominium_id = condo_id;
  select count(*) into settings_audit_count
    from public.audit_events
   where entity_type = 'maintenance_settings'
     and entity_id = condo_id
     and event_type = 'maintenance.update';
  if settings_audit_count <> 1 then raise exception 'maintenance_settings update audit missing'; end if;

  insert into public.maintenance_equipment(condominium_id, structure_id, identification, status)
  values (condo_id, structure_id, 'P8.1 TEST INACTIVE', 'inactive') returning id into equipment_id;
  if public.require_active_maintenance_equipment(equipment_id, condo_id) then raise exception 'inactive equipment accepted as operational'; end if;
  select entity_type into audit_type from public.audit_events where entity_id = equipment_id and entity_type = 'maintenance_equipment' order by created_at desc limit 1;
  if audit_type is distinct from 'maintenance_equipment' then raise exception 'inactive equipment audit missing'; end if;

  update public.maintenance_equipment set status = 'retired' where id = equipment_id;
  if public.require_active_maintenance_equipment(equipment_id, condo_id) then raise exception 'retired equipment accepted as operational'; end if;
  if not exists (select 1 from public.maintenance_equipment where id = equipment_id and status = 'retired') then raise exception 'retired equipment history was not preserved'; end if;

  foreach audit_type in array array['person_document', 'unit_financial_responsibility', 'visitor', 'service_provider', 'access_point', 'package_collection'] loop
    insert into public.audit_events(event_type, entity_type, entity_id) values ('p8_1.compatibility_test', audit_type, gen_random_uuid());
  end loop;
end $$;

rollback;
