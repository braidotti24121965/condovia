begin;

do $$
declare
  client_id uuid;
  condo_id uuid;
  structure_id uuid;
  person_id uuid;
  auth_id uuid := '83000000-0000-4000-8000-000000000001';
  account_id uuid;
  provider_id uuid;
  v_work_order_id uuid;
  audit_count integer;
begin
  if to_regclass('public.maintenance_work_orders') is null
     or to_regclass('public.maintenance_work_order_history') is null
     or to_regclass('public.maintenance_work_order_participants') is null then
    raise exception 'P8.3 tables are missing';
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='maintenance_work_orders' and policyname='maintenance_work_orders_read') then
    raise exception 'P8.3 work-order RLS policy is missing';
  end if;

  insert into public.clients(legal_name) values ('P8.3 Test Client') returning id into client_id;
  insert into public.condominiums(client_id, name) values (client_id, 'P8.3 Test Condominium') returning id into condo_id;
  insert into public.condominium_structures(condominium_id, structure_type, name) values (condo_id, 'building', 'P8.3 Common Area') returning id into structure_id;
  insert into public.people(full_name) values ('P8.3 Internal User') returning id into person_id;
  insert into auth.users(id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
    values (auth_id, 'authenticated', 'authenticated', 'p8.3@example.test', '', now(), now(), now());
  insert into public.user_accounts(auth_user_id, person_id) values (auth_id, person_id) returning id into account_id;
  insert into public.service_providers(condominium_id, full_name, service_type) values (condo_id, 'P8.3 Provider', 'Electrical') returning id into provider_id;

  insert into public.maintenance_work_orders(condominium_id, work_order_number, structure_id, description, priority, origin, status, responsible_user_account_id, service_provider_id, created_by_user_account_id)
    values (condo_id, 1, structure_id, 'P8.3 test work order', 'medium', 'direct', 'open', account_id, provider_id, account_id)
    returning id into v_work_order_id;
  insert into public.maintenance_work_order_history(work_order_id, condominium_id, event_type, new_status, actor_user_account_id)
    values (v_work_order_id, condo_id, 'created', 'open', account_id);
  if not exists (select 1 from public.maintenance_work_order_history h where h.work_order_id=v_work_order_id and h.event_type is not null) then
    raise exception 'P8.3 history was not preserved';
  end if;
  select count(*) into audit_count from public.audit_events where entity_type='maintenance_work_order' and entity_id=v_work_order_id;
  if audit_count < 1 then raise exception 'P8.3 audit event was not emitted'; end if;

  begin
    insert into public.maintenance_work_orders(condominium_id, work_order_number, structure_id, description, priority, origin, status, created_by_user_account_id)
      values (condo_id, 2, structure_id, 'Invalid cancellation', 'low', 'direct', 'cancelled', account_id);
    raise exception 'Cancellation without reason was accepted';
  exception when check_violation then null;
  end;
end $$;

rollback;
