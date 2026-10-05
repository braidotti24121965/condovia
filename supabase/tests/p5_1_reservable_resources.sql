begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

insert into public.clients (id, legal_name) values ('a5510000-0000-4000-8000-000000000001', 'P5.1 Test Client');
insert into public.condominiums (id, client_id, name, timezone) values
  ('c5511000-0000-4000-8000-000000000001', 'a5510000-0000-4000-8000-000000000001', 'P5.1 Alpha', 'America/Sao_Paulo'),
  ('c5512000-0000-4000-8000-000000000002', 'a5510000-0000-4000-8000-000000000001', 'P5.1 Beta', 'America/Sao_Paulo');
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at) values
  ('55110000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'p5-alpha-manager@example.test', '', now(), now(), now()),
  ('55110000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'p5-beta-manager@example.test', '', now(), now(), now()),
  ('55110000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'p5-alpha-reader@example.test', '', now(), now(), now());
insert into public.people (id, full_name, status) values
  ('55111000-0000-4000-8000-000000000001', 'P5.1 Alpha Manager', 'active'),
  ('55111000-0000-4000-8000-000000000002', 'P5.1 Beta Manager', 'active'),
  ('55111000-0000-4000-8000-000000000003', 'P5.1 Alpha Reader', 'active');
insert into public.user_accounts (id, auth_user_id, person_id, status) values
  ('aa551100-0000-4000-8000-000000000001', '55110000-0000-4000-8000-000000000001', '55111000-0000-4000-8000-000000000001', 'active'),
  ('aa551100-0000-4000-8000-000000000002', '55110000-0000-4000-8000-000000000002', '55111000-0000-4000-8000-000000000002', 'active'),
  ('aa551100-0000-4000-8000-000000000003', '55110000-0000-4000-8000-000000000003', '55111000-0000-4000-8000-000000000003', 'active');
insert into public.condominium_memberships (id, condominium_id, user_account_id, status) values
  ('55112000-0000-4000-8000-000000000001', 'c5511000-0000-4000-8000-000000000001', 'aa551100-0000-4000-8000-000000000001', 'active'),
  ('55112000-0000-4000-8000-000000000002', 'c5512000-0000-4000-8000-000000000002', 'aa551100-0000-4000-8000-000000000002', 'active'),
  ('55112000-0000-4000-8000-000000000003', 'c5511000-0000-4000-8000-000000000001', 'aa551100-0000-4000-8000-000000000003', 'active');
insert into public.role_assignments (user_account_id, role_id, condominium_id) values
  ('aa551100-0000-4000-8000-000000000001', (select id from public.roles where code = 'condominium.manager'), 'c5511000-0000-4000-8000-000000000001'),
  ('aa551100-0000-4000-8000-000000000002', (select id from public.roles where code = 'condominium.manager'), 'c5512000-0000-4000-8000-000000000002'),
  ('aa551100-0000-4000-8000-000000000003', (select id from public.roles where code = 'condominium.resident_owner'), 'c5511000-0000-4000-8000-000000000001');

select has_table('public', 'reservable_resources', 'reservable_resources exists');
select has_table('public', 'reservable_resource_hours', 'reservable_resource_hours exists');
select is((select count(*)::int from public.permissions where code = 'reservations.resources.read'), 1, 'resource read permission exists');
select is((select count(*)::int from public.permissions where code = 'reservations.resources.manage'), 1, 'resource manage permission exists');
select is((select data_type from information_schema.columns where table_schema = 'public' and table_name = 'reservable_resource_hours' and column_name = 'start_time'), 'time without time zone', 'recurring start_time is local TIME');
select is((select data_type from information_schema.columns where table_schema = 'public' and table_name = 'reservable_resources' and column_name = 'created_at'), 'timestamp with time zone', 'created_at is timestamptz');

set local role authenticated;
select set_config('request.jwt.claim.sub', '55110000-0000-4000-8000-000000000002', true);
insert into public.reservable_resources (id, condominium_id, name) values ('55113000-0000-4000-8000-000000000002', 'c5512000-0000-4000-8000-000000000002', 'Salão Beta');
insert into public.reservable_resource_hours (id, resource_id, condominium_id, weekday, start_time, end_time) values ('55114000-0000-4000-8000-000000000002', '55113000-0000-4000-8000-000000000002', 'c5512000-0000-4000-8000-000000000002', 1, '09:00', '17:00');
select set_config('request.jwt.claim.sub', '55110000-0000-4000-8000-000000000001', true);
select ok(public.has_permission('reservations.resources.read', 'c5511000-0000-4000-8000-000000000001'), 'manager has resource read');
select ok(public.has_permission('reservations.resources.manage', 'c5511000-0000-4000-8000-000000000001'), 'manager has resource manage');

insert into public.reservable_resources (id, condominium_id, name, capacity, minimum_duration_minutes, usage_fee)
values ('55113000-0000-4000-8000-000000000001', 'c5511000-0000-4000-8000-000000000001', 'Salão Alpha', 80, 60, 25.50);
insert into public.reservable_resource_hours (id, resource_id, condominium_id, weekday, start_time, end_time)
values ('55114000-0000-4000-8000-000000000001', '55113000-0000-4000-8000-000000000001', 'c5511000-0000-4000-8000-000000000001', 1, '08:00', '22:00');

select set_config('request.jwt.claim.sub', '55110000-0000-4000-8000-000000000003', true);
select is((select count(*)::int from public.reservable_resources where id = '55113000-0000-4000-8000-000000000001'), 1, 'reader can read own tenant resource');
select is((select count(*)::int from public.reservable_resource_hours where id = '55114000-0000-4000-8000-000000000001'), 1, 'reader can read own tenant hours');
select throws_ok($$insert into public.reservable_resources (condominium_id, name) values ('c5511000-0000-4000-8000-000000000001', 'Reader attempt')$$, '42501', null, 'reader without manage cannot create resource');
select is((select count(*)::int from public.reservable_resources where name = 'Reader attempt'), 0, 'reader without manage cannot create resource');

select set_config('request.jwt.claim.sub', '55110000-0000-4000-8000-000000000001', true);
select throws_ok($$insert into public.reservable_resources (id, condominium_id, name) values ('55113000-0000-4000-8000-000000000002', 'c5512000-0000-4000-8000-000000000002', 'Salão Beta')$$, '42501', null, 'tenant A cannot insert resource in tenant B');
select throws_ok($$insert into public.reservable_resource_hours (id, resource_id, condominium_id, weekday, start_time, end_time) values ('55114000-0000-4000-8000-000000000002', '55113000-0000-4000-8000-000000000002', 'c5512000-0000-4000-8000-000000000002', 1, '09:00', '17:00')$$, '42501', null, 'tenant A cannot insert hours in tenant B');
select is((select count(*)::int from public.reservable_resources where id = '55113000-0000-4000-8000-000000000002'), 0, 'tenant A cannot insert resource in tenant B');
select is((select count(*)::int from public.reservable_resource_hours where id = '55114000-0000-4000-8000-000000000002'), 0, 'tenant A cannot insert hours in tenant B');
select is((select count(*)::int from public.reservable_resources where id = '55113000-0000-4000-8000-000000000002'), 0, 'tenant A cannot read tenant B resource');
select is((select count(*)::int from public.reservable_resource_hours where id = '55114000-0000-4000-8000-000000000002'), 0, 'tenant A cannot read tenant B hours');
select lives_ok($$update public.reservable_resources set name = 'Cross tenant update' where id = '55113000-0000-4000-8000-000000000002'$$, 'cross tenant update is blocked by RLS');
select throws_ok($$delete from public.reservable_resources where id = '55113000-0000-4000-8000-000000000002'$$, '42501', null, 'physical resource delete is prohibited');

select throws_ok($$insert into public.reservable_resource_hours (resource_id, condominium_id, weekday, start_time, end_time) values ('55113000-0000-4000-8000-000000000001', 'c5511000-0000-4000-8000-000000000001', 2, '18:00', '08:00')$$, '23514', null, 'inverted recurring hours are rejected');
select throws_ok($$insert into public.reservable_resource_hours (resource_id, condominium_id, weekday, start_time, end_time) values ('55113000-0000-4000-8000-000000000001', 'c5511000-0000-4000-8000-000000000001', 1, '10:00', '14:00')$$, 'P0001', 'Horário de disponibilidade sobreposto para este recurso', 'overlapping recurring hours are rejected');
select throws_ok($$insert into public.reservable_resources (condominium_id, name, capacity) values ('c5511000-0000-4000-8000-000000000001', 'Capacidade inválida', 0)$$, '23514', null, 'invalid capacity is rejected');
select throws_ok($$insert into public.reservable_resources (condominium_id, name, minimum_duration_minutes, maximum_duration_minutes) values ('c5511000-0000-4000-8000-000000000001', 'Duração inválida', 120, 60)$$, '23514', null, 'invalid duration range is rejected');
select throws_ok($$insert into public.reservable_resources (condominium_id, name, usage_fee) values ('c5511000-0000-4000-8000-000000000001', 'Valor inválido', -1)$$, '23514', null, 'negative usage fee is rejected');
select is((select start_time::text || '–' || end_time::text from public.reservable_resource_hours where id = '55114000-0000-4000-8000-000000000001'), '08:00:00–22:00:00', 'recurring hours remain local time values');
select is((select count(*)::int from public.reservable_resources where created_at is not null and updated_at is not null), 1, 'resource timestamps are populated as absolute instants');

select * from finish();
rollback;
