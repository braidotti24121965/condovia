create extension if not exists pgtap with schema extensions;
select plan(96);
begin;

-- 1. Setup test clients and condominiums
-- UUID namespace 458 is reserved for this transactional P4 SQL suite.
insert into public.clients (id, legal_name) values ('a4580000-0000-4000-8000-000000000001', 'P4 Test Client');

insert into public.condominiums (id, client_id, name, timezone) values
  ('c4581000-0000-4000-8000-000000000001', 'a4580000-0000-4000-8000-000000000001', 'Condo P4 Alpha', 'America/Sao_Paulo'),
  ('c4582000-0000-4000-8000-000000000002', 'a4580000-0000-4000-8000-000000000001', 'Condo P4 Beta', 'America/Sao_Paulo');

-- 2. Setup access points
insert into public.access_points (id, condominium_id, name, type) values
  ('ab458100-0000-4000-8000-000000000001', 'c4581000-0000-4000-8000-000000000001', 'Portaria Principal', 'mixed'),
  ('ab458200-0000-4000-8000-000000000002', 'c4582000-0000-4000-8000-000000000002', 'Portaria Beta', 'mixed');

-- 3. Setup structures and units
insert into public.condominium_structures (id, condominium_id, name, structure_type) values
  ('d4581000-0000-4000-8000-000000000001', 'c4581000-0000-4000-8000-000000000001', 'Torre 1', 'tower'),
  ('d4582000-0000-4000-8000-000000000002', 'c4582000-0000-4000-8000-000000000002', 'Torre B', 'tower');

insert into public.units (id, condominium_id, structure_id, code, unit_type) values
  ('e4581000-0000-4000-8000-000000000001', 'c4581000-0000-4000-8000-000000000001', 'd4581000-0000-4000-8000-000000000001', '101', 'apartment'),
  ('e4581000-0000-4000-8000-000000000002', 'c4581000-0000-4000-8000-000000000001', 'd4581000-0000-4000-8000-000000000001', '102', 'apartment'),
  ('e4582000-0000-4000-8000-000000000001', 'c4582000-0000-4000-8000-000000000002', 'd4582000-0000-4000-8000-000000000002', '201', 'apartment');

-- 4. Setup people
insert into public.people (id, full_name, status) values
  ('b4581000-0000-4000-8000-000000000001', 'Porteiro Alpha', 'active'),
  ('b4581000-0000-4000-8000-000000000002', 'Fernando Morador', 'active'),
  ('b4581000-0000-4000-8000-000000000003', 'Outro Morador', 'active'),
  ('b4582000-0000-4000-8000-000000000004', 'Porteiro Beta', 'active'),
  ('b4581000-0000-4000-8000-000000000005', 'Financeiro Apenas', 'active');

insert into public.person_condominium_links (person_id, condominium_id, status) values
  ('b4581000-0000-4000-8000-000000000001', 'c4581000-0000-4000-8000-000000000001', 'active'),
  ('b4581000-0000-4000-8000-000000000002', 'c4581000-0000-4000-8000-000000000001', 'active'),
  ('b4581000-0000-4000-8000-000000000003', 'c4581000-0000-4000-8000-000000000001', 'active'),
  ('b4582000-0000-4000-8000-000000000004', 'c4582000-0000-4000-8000-000000000002', 'active'),
  ('b4581000-0000-4000-8000-000000000005', 'c4581000-0000-4000-8000-000000000001', 'active');

-- Auth & accounts
insert into auth.users (id, email) values
  ('a4581000-0000-4000-8000-000000000001', 'porteiro.alpha@condovia.test'),
  ('a4581000-0000-4000-8000-000000000002', 'fernando@condovia.test'),
  ('a4581000-0000-4000-8000-000000000003', 'outro@condovia.test'),
  ('a4582000-0000-4000-8000-000000000004', 'porteiro.beta@condovia.test'),
  ('a4581000-0000-4000-8000-000000000005', 'financeiro@condovia.test');

insert into public.user_accounts (id, auth_user_id, person_id, status) values
  ('aa458100-0000-4000-8000-000000000001', 'a4581000-0000-4000-8000-000000000001', 'b4581000-0000-4000-8000-000000000001', 'active'),
  ('aa458100-0000-4000-8000-000000000002', 'a4581000-0000-4000-8000-000000000002', 'b4581000-0000-4000-8000-000000000002', 'active'),
  ('aa458100-0000-4000-8000-000000000003', 'a4581000-0000-4000-8000-000000000003', 'b4581000-0000-4000-8000-000000000003', 'active'),
  ('aa458200-0000-4000-8000-000000000004', 'a4582000-0000-4000-8000-000000000004', 'b4582000-0000-4000-8000-000000000004', 'active'),
  ('aa458100-0000-4000-8000-000000000005', 'a4581000-0000-4000-8000-000000000005', 'b4581000-0000-4000-8000-000000000005', 'active');

insert into public.condominium_memberships (id, condominium_id, user_account_id, status) values
  ('f4581000-0000-4000-8000-000000000001', 'c4581000-0000-4000-8000-000000000001', 'aa458100-0000-4000-8000-000000000001', 'active'),
  ('f4581000-0000-4000-8000-000000000002', 'c4581000-0000-4000-8000-000000000001', 'aa458100-0000-4000-8000-000000000002', 'active'),
  ('f4581000-0000-4000-8000-000000000003', 'c4581000-0000-4000-8000-000000000001', 'aa458100-0000-4000-8000-000000000003', 'active'),
  ('f4582000-0000-4000-8000-000000000004', 'c4582000-0000-4000-8000-000000000002', 'aa458200-0000-4000-8000-000000000004', 'active'),
  ('f4581000-0000-4000-8000-000000000005', 'c4581000-0000-4000-8000-000000000001', 'aa458100-0000-4000-8000-000000000005', 'active');

-- Role assignments
insert into public.role_assignments (user_account_id, role_id, condominium_id)
select 'aa458100-0000-4000-8000-000000000001', id, 'c4581000-0000-4000-8000-000000000001' from public.roles where code = 'condominium.doorman';

insert into public.role_assignments (user_account_id, role_id, condominium_id)
select 'aa458100-0000-4000-8000-000000000002', id, 'c4581000-0000-4000-8000-000000000001' from public.roles where code = 'condominium.resident';

insert into public.role_assignments (user_account_id, role_id, condominium_id)
select 'aa458100-0000-4000-8000-000000000003', id, 'c4581000-0000-4000-8000-000000000001' from public.roles where code = 'condominium.resident';

insert into public.role_assignments (user_account_id, role_id, condominium_id)
select 'aa458200-0000-4000-8000-000000000004', id, 'c4582000-0000-4000-8000-000000000002' from public.roles where code = 'condominium.doorman';

insert into public.role_assignments (user_account_id, role_id, condominium_id)
select 'aa458100-0000-4000-8000-000000000005', id, 'c4581000-0000-4000-8000-000000000001' from public.roles where code = 'condominium.resident';

-- Unit relationships
-- Fernando is active owner and resident of 101
insert into public.unit_ownerships (condominium_id, unit_id, person_id, ownership_percentage, starts_at) values
  ('c4581000-0000-4000-8000-000000000001', 'e4581000-0000-4000-8000-000000000001', 'b4581000-0000-4000-8000-000000000002', 100, '2026-01-01');

insert into public.unit_occupancies (condominium_id, unit_id, person_id, occupancy_type, is_primary, starts_at) values
  ('c4581000-0000-4000-8000-000000000001', 'e4581000-0000-4000-8000-000000000001', 'b4581000-0000-4000-8000-000000000002', 'owner', true, '2026-01-01');

-- Outro Morador is resident of 102
insert into public.unit_occupancies (condominium_id, unit_id, person_id, occupancy_type, is_primary, starts_at) values
  ('c4581000-0000-4000-8000-000000000001', 'e4581000-0000-4000-8000-000000000002', 'b4581000-0000-4000-8000-000000000003', 'tenant', true, '2026-01-01');

-- Financeiro Apenas is ONLY financial responsible for 101 (NOT owner/occupant)
insert into public.unit_financial_responsibilities (condominium_id, unit_id, person_id, starts_at) values
  ('c4581000-0000-4000-8000-000000000001', 'e4581000-0000-4000-8000-000000000001', 'b4581000-0000-4000-8000-000000000005', '2026-01-01');

-- 5. Test Schema and Constraints
select has_table('public', 'visitors', 'visitors table exists');
select has_table('public', 'service_providers', 'service_providers table exists');
select has_table('public', 'access_points', 'access_points table exists');
select has_table('public', 'access_authorizations', 'access_authorizations table exists');
select has_table('public', 'access_requests', 'access_requests table exists');
select has_table('public', 'access_events', 'access_events table exists');
select has_table('public', 'packages', 'packages table exists');
select has_table('public', 'package_collections', 'package_collections table exists');

-- Constraints: valid_from < valid_until
select throws_ok(
  $$ insert into public.access_authorizations (condominium_id, unit_id, visitor_id, authorized_by_person_id, valid_from, valid_until)
     values ('c4581000-0000-4000-8000-000000000001', 'e4581000-0000-4000-8000-000000000001', gen_random_uuid(), 'b4581000-0000-4000-8000-000000000002', now(), now() - interval '1 hour') $$,
  '23514', null, 'valid_from >= valid_until is rejected by check constraint'
);

-- Constraints: visitor XOR provider
select throws_ok(
  $$ insert into public.access_authorizations (condominium_id, unit_id, visitor_id, service_provider_id, authorized_by_person_id, valid_from, valid_until)
     values ('c4581000-0000-4000-8000-000000000001', 'e4581000-0000-4000-8000-000000000001', gen_random_uuid(), gen_random_uuid(), 'b4581000-0000-4000-8000-000000000002', now(), now() + interval '1 hour') $$,
  '23514', null, 'both visitor and provider in authorization is rejected'
);

select throws_ok(
  $$ insert into public.access_authorizations (condominium_id, unit_id, authorized_by_person_id, valid_from, valid_until)
     values ('c4581000-0000-4000-8000-000000000001', 'e4581000-0000-4000-8000-000000000001', 'b4581000-0000-4000-8000-000000000002', now(), now() + interval '1 hour') $$,
  '23514', null, 'neither visitor nor provider in authorization is rejected'
);

-- 6. Setup Visitors and Providers
insert into public.visitors (id, condominium_id, full_name, document_type, document_number) values
  ('ca458100-0000-4000-8000-000000000001', 'c4581000-0000-4000-8000-000000000001', 'João Visitante', 'cpf', '11122233344'),
  ('ca458100-0000-4000-8000-000000000002', 'c4581000-0000-4000-8000-000000000001', 'Maria Visitante', 'rg', '12345678'),
  ('f458c000-0000-4000-8000-000000000003', 'c4581000-0000-4000-8000-000000000001', 'Sem Autorização', null, null),
  ('f458c000-0000-4000-8000-000000000004', 'c4581000-0000-4000-8000-000000000001', 'Visitante Unidade 102', null, null),
  ('f458c000-0000-4000-8000-000000000005', 'c4582000-0000-4000-8000-000000000002', 'Visitante Beta', null, null);

-- Authorization fixtures used by the targeted visitor visibility assertions.
insert into public.access_authorizations (
  id, condominium_id, unit_id, visitor_id, authorized_by_person_id,
  valid_from, valid_until, status
) values
  ('f458c000-0000-4000-8000-000000000013', 'c4581000-0000-4000-8000-000000000001', 'e4581000-0000-4000-8000-000000000002', 'f458c000-0000-4000-8000-000000000004', 'b4581000-0000-4000-8000-000000000003', now() - interval '1 hour', now() + interval '8 hours', 'approved'),
  ('f458c000-0000-4000-8000-000000000014', 'c4582000-0000-4000-8000-000000000002', 'e4582000-0000-4000-8000-000000000001', 'f458c000-0000-4000-8000-000000000005', 'b4582000-0000-4000-8000-000000000004', now() - interval '1 hour', now() + interval '8 hours', 'approved');

insert into public.service_providers (id, condominium_id, full_name, company_name, service_type) values
  ('cb458100-0000-4000-8000-000000000001', 'c4581000-0000-4000-8000-000000000001', 'Carlos Eletricista', 'Luz e Força', 'Elétrica');

-- 7. Test Unit Eligibility Helper
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a4581000-0000-4000-8000-000000000002', true); -- Fernando
select is(public.is_unit_eligible_for_resident('e4581000-0000-4000-8000-000000000001', 'c4581000-0000-4000-8000-000000000001'), true, 'Fernando is eligible for unit 101');
select is(public.is_unit_eligible_for_resident('e4581000-0000-4000-8000-000000000002', 'c4581000-0000-4000-8000-000000000001'), false, 'Fernando is NOT eligible for unit 102');

select set_config('request.jwt.claim.sub', 'a4581000-0000-4000-8000-000000000005', true); -- Financeiro Apenas
select is(public.is_unit_eligible_for_resident('e4581000-0000-4000-8000-000000000001', 'c4581000-0000-4000-8000-000000000001'), false, 'Financial-only is NOT eligible for authorizations');

-- 8. GOLDEN PATH 1: Fernando authorizes João -> Entry -> Presence -> Exit -> History
select set_config('request.jwt.claim.sub', 'a4581000-0000-4000-8000-000000000002', true); -- Fernando creates authorization

insert into public.access_authorizations (
  id, condominium_id, unit_id, visitor_id, authorized_by_person_id, authorized_by_user_account_id,
  valid_from, valid_until, status
) values (
  'fa458100-0000-4000-8000-000000000001', 'c4581000-0000-4000-8000-000000000001', 'e4581000-0000-4000-8000-000000000001',
  'ca458100-0000-4000-8000-000000000001', 'b4581000-0000-4000-8000-000000000002', 'aa458100-0000-4000-8000-000000000002',
  now() - interval '1 hour', now() + interval '8 hours', 'approved'
);

select ok(exists (select 1 from public.access_authorizations where id = 'fa458100-0000-4000-8000-000000000001'), 'Fernando created authorization for João');
select is((select full_name from public.visitors where id = 'ca458100-0000-4000-8000-000000000001'), 'João Visitante', 'R1 resident can read visitor associated with own unit authorization');
select is((select count(*) from public.visitors where id = 'f458c000-0000-4000-8000-000000000004'), 0::bigint, 'R2 resident cannot read visitor associated only with another unit');
select is((select count(*) from public.visitors where id = 'f458c000-0000-4000-8000-000000000005'), 0::bigint, 'R3 Alpha resident cannot read visitor from Beta condominium');
select is((select count(*) from public.visitors where id = 'f458c000-0000-4000-8000-000000000003'), 0::bigint, 'R4 resident cannot list a visitor without a related authorization');

select set_config('request.jwt.claim.sub', 'a4581000-0000-4000-8000-000000000005', true); -- Financeiro Apenas, no eligible unit access
select is((select count(*) from public.visitors where id = 'ca458100-0000-4000-8000-000000000001'), 0::bigint, 'R5 user without eligible unit access cannot read the visitor');

select set_config('request.jwt.claim.sub', 'a4581000-0000-4000-8000-000000000001', true); -- Porteiro Alpha
select is((select full_name from public.visitors where id = 'ca458100-0000-4000-8000-000000000001'), 'João Visitante', 'R6 doorman retains operational visitors.read access');

-- Porteiro Alpha registers entry
select set_config('request.jwt.claim.sub', 'a4581000-0000-4000-8000-000000000001', true); -- Porteiro Alpha

select lives_ok(
  $$ select public.register_access_entry('c4581000-0000-4000-8000-000000000001', 'fa458100-0000-4000-8000-000000000001', 'ab458100-0000-4000-8000-000000000001', 'Visita social') $$,
  'Porteiro registers valid entry for João'
);

-- Check presence: João is INSIDE
select is((select count(*) from public.get_gatehouse_presence('c4581000-0000-4000-8000-000000000001') where target_id = 'ca458100-0000-4000-8000-000000000001'), 1::bigint, 'João appears in get_gatehouse_presence');

-- Concurrency guard: second entry rejected
select throws_ok(
  $$ select public.register_access_entry('c4581000-0000-4000-8000-000000000001', 'fa458100-0000-4000-8000-000000000001', 'ab458100-0000-4000-8000-000000000001') $$,
  'P0001', 'Acesso duplicado rejeitado: a pessoa já consta dentro do condomínio', 'Duplicate entry rejected'
);

-- Porteiro registers EXIT
select lives_ok(
  $$ select public.register_access_exit('c4581000-0000-4000-8000-000000000001', 'ca458100-0000-4000-8000-000000000001', null, 'ab458100-0000-4000-8000-000000000001', 'Saída normal') $$,
  'Porteiro registers exit for João'
);

-- Check presence: João is OUT
select is((select count(*) from public.get_gatehouse_presence('c4581000-0000-4000-8000-000000000001') where target_id = 'ca458100-0000-4000-8000-000000000001'), 0::bigint, 'João is no longer in get_gatehouse_presence');

-- Second exit rejected
select throws_ok(
  $$ select public.register_access_exit('c4581000-0000-4000-8000-000000000001', 'ca458100-0000-4000-8000-000000000001', null, 'ab458100-0000-4000-8000-000000000001') $$,
  'P0001', 'Saída inválida: a pessoa não consta dentro do condomínio', 'Duplicate exit rejected'
);

-- Historical events intact
select is((select count(*) from public.access_events where visitor_id = 'ca458100-0000-4000-8000-000000000001' and event_type = 'entry'), 1::bigint, 'Historical entry preserved');
select is((select count(*) from public.access_events where visitor_id = 'ca458100-0000-4000-8000-000000000001' and event_type = 'exit'), 1::bigint, 'Historical exit preserved');

-- 9. GOLDEN PATH 2: Request -> Approval -> Authorization -> Entry
-- Porteiro creates request for Maria targeting Unit 101
insert into public.access_requests (
  id, condominium_id, unit_id, visitor_id, requested_by_user_account_id, status, notes
) values (
  'de458100-0000-4000-8000-000000000001', 'c4581000-0000-4000-8000-000000000001', 'e4581000-0000-4000-8000-000000000001',
  'ca458100-0000-4000-8000-000000000002', 'aa458100-0000-4000-8000-000000000001', 'pending', 'Aguardando na portaria'
);

-- Fernando (101) sees it
select set_config('request.jwt.claim.sub', 'a4581000-0000-4000-8000-000000000002', true);
select ok(exists (select 1 from public.access_requests where id = 'de458100-0000-4000-8000-000000000001'), 'Fernando can see request for unit 101');

-- Outro Morador (102) CANNOT see it
select set_config('request.jwt.claim.sub', 'a4581000-0000-4000-8000-000000000003', true);
select ok(not exists (select 1 from public.access_requests where id = 'de458100-0000-4000-8000-000000000001'), 'Outro morador cannot see request for unit 101');

-- Fernando approves request
select set_config('request.jwt.claim.sub', 'a4581000-0000-4000-8000-000000000002', true);
select lives_ok(
  $$ select public.decide_access_request('de458100-0000-4000-8000-000000000001', 'approved', 'Pode subir') $$,
  'Fernando approves access request'
);

-- Check request is approved and authorization generated
select is((select status from public.access_requests where id = 'de458100-0000-4000-8000-000000000001'), 'approved', 'Request status is approved');
select ok(exists (select 1 from public.access_authorizations where source_request_id = 'de458100-0000-4000-8000-000000000001'), 'Authorization created from request');

-- 10. GOLDEN PATH 3: Packages Lifecycle
-- Porteiro receives package for 101
select set_config('request.jwt.claim.sub', 'a4581000-0000-4000-8000-000000000001', true); -- Porteiro Alpha

insert into public.packages (
  id, condominium_id, unit_id, recipient_person_id, carrier, description, received_by_user_account_id, status
) values (
  'ee458100-0000-4000-8000-000000000001', 'c4581000-0000-4000-8000-000000000001', 'e4581000-0000-4000-8000-000000000001',
  'b4581000-0000-4000-8000-000000000002', 'Correios', 'Caixa média', 'aa458100-0000-4000-8000-000000000001', 'received'
);

-- Fernando (101) sees package
select set_config('request.jwt.claim.sub', 'a4581000-0000-4000-8000-000000000002', true);
select ok(exists (select 1 from public.packages where id = 'ee458100-0000-4000-8000-000000000001'), 'Fernando sees his unit package');

-- Outro Morador (102) CANNOT see package
select set_config('request.jwt.claim.sub', 'a4581000-0000-4000-8000-000000000003', true);
select ok(not exists (select 1 from public.packages where id = 'ee458100-0000-4000-8000-000000000001'), 'Outro morador cannot see unit 101 package');

-- Porteiro collects package
select set_config('request.jwt.claim.sub', 'a4581000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$ select public.collect_package('ee458100-0000-4000-8000-000000000001', 'b4581000-0000-4000-8000-000000000002', 'Fernando Morador', '11122233344', 'Retirada pelo titular') $$,
  'Package collection registered'
);

select is((select status from public.packages where id = 'ee458100-0000-4000-8000-000000000001'), 'collected', 'Package marked as collected');
select ok(exists (select 1 from public.package_collections where package_id = 'ee458100-0000-4000-8000-000000000001'), 'Collection receipt saved');

-- Second collection rejected
select throws_ok(
  $$ select public.collect_package('ee458100-0000-4000-8000-000000000001', 'b4581000-0000-4000-8000-000000000002') $$,
  'P0001', 'Segunda retirada rejeitada: encomenda já foi retirada anteriormente', 'Duplicate collection rejected'
);

-- 11. Cross-Tenant Isolation
-- Porteiro Beta in Condo Beta tries to access Condo Alpha data
select set_config('request.jwt.claim.sub', 'a4582000-0000-4000-8000-000000000004', true); -- Porteiro Beta

select ok(not exists (select 1 from public.visitors where condominium_id = 'c4581000-0000-4000-8000-000000000001'), 'Beta doorman cannot see Alpha visitors');
select ok(not exists (select 1 from public.access_authorizations where condominium_id = 'c4581000-0000-4000-8000-000000000001'), 'Beta doorman cannot see Alpha authorizations');
select ok(not exists (select 1 from public.packages where condominium_id = 'c4581000-0000-4000-8000-000000000001'), 'Beta doorman cannot see Alpha packages');
select ok(not exists (select 1 from public.access_events where condominium_id = 'c4581000-0000-4000-8000-000000000001'), 'Beta doorman cannot see Alpha access events');

-- Cross-tenant RPC call rejected
select throws_ok(
  $$ select public.register_access_entry('c4581000-0000-4000-8000-000000000001', 'fa458100-0000-4000-8000-000000000001', 'ab458100-0000-4000-8000-000000000001') $$,
  'P0001', 'Permissão negada para registrar entrada na portaria', 'Cross-tenant entry call rejected'
);

-- Historical immutability test
reset role;
select throws_ok(
  $$ update public.access_events set notes = 'editado' where condominium_id = 'c4581000-0000-4000-8000-000000000001' $$,
  'P0001', 'Access events are factual historical records and cannot be modified or deleted', 'Mutation of access_events rejected'
);

select throws_ok(
  $$ delete from public.access_events where condominium_id = 'c4581000-0000-4000-8000-000000000001' $$,
  'P0001', 'Access events are factual historical records and cannot be modified or deleted', 'Deletion of access_events rejected'
);

-- ACL Tests on P4 tables
select ok(has_table_privilege('authenticated', 'public.visitors', 'SELECT'), 'authenticated can select visitors');
select ok(has_table_privilege('authenticated', 'public.visitors', 'INSERT'), 'authenticated can insert visitors');
select ok(has_table_privilege('authenticated', 'public.visitors', 'UPDATE'), 'authenticated can update visitors');
select ok(not has_table_privilege('authenticated', 'public.visitors', 'DELETE'), 'authenticated cannot delete visitors');

select ok(has_table_privilege('authenticated', 'public.service_providers', 'SELECT'), 'authenticated can select providers');
select ok(has_table_privilege('authenticated', 'public.service_providers', 'INSERT'), 'authenticated can insert providers');
select ok(has_table_privilege('authenticated', 'public.service_providers', 'UPDATE'), 'authenticated can update providers');
select ok(not has_table_privilege('authenticated', 'public.service_providers', 'DELETE'), 'authenticated cannot delete providers');

select ok(has_table_privilege('authenticated', 'public.access_authorizations', 'SELECT'), 'authenticated can select authorizations');
select ok(has_table_privilege('authenticated', 'public.access_authorizations', 'INSERT'), 'authenticated can insert authorizations');
select ok(has_table_privilege('authenticated', 'public.access_authorizations', 'UPDATE'), 'authenticated can update authorizations');
select ok(not has_table_privilege('authenticated', 'public.access_authorizations', 'DELETE'), 'authenticated cannot delete authorizations');

select ok(has_table_privilege('authenticated', 'public.access_events', 'SELECT'), 'authenticated can select access_events');
select ok(has_table_privilege('authenticated', 'public.access_events', 'INSERT'), 'authenticated can insert access_events');
select ok(not has_table_privilege('authenticated', 'public.access_events', 'UPDATE'), 'authenticated cannot update access_events');
select ok(not has_table_privilege('authenticated', 'public.access_events', 'DELETE'), 'authenticated cannot delete access_events');

select ok(has_table_privilege('authenticated', 'public.packages', 'SELECT'), 'authenticated can select packages');
select ok(has_table_privilege('authenticated', 'public.packages', 'INSERT'), 'authenticated can insert packages');
select ok(has_table_privilege('authenticated', 'public.packages', 'UPDATE'), 'authenticated can update packages');
select ok(not has_table_privilege('authenticated', 'public.packages', 'DELETE'), 'authenticated cannot delete packages');

select ok(has_table_privilege('authenticated', 'public.package_collections', 'SELECT'), 'authenticated can select collections');
select ok(has_table_privilege('authenticated', 'public.package_collections', 'INSERT'), 'authenticated can insert collections');
select ok(not has_table_privilege('authenticated', 'public.package_collections', 'UPDATE'), 'authenticated cannot update collections');
select ok(not has_table_privilege('authenticated', 'public.package_collections', 'DELETE'), 'authenticated cannot delete collections');

-- Anon privileges: none on P4 tables
select ok(not has_table_privilege('anon', 'public.visitors', 'SELECT'), 'anon cannot select visitors');
select ok(not has_table_privilege('anon', 'public.visitors', 'INSERT'), 'anon cannot insert visitors');
select ok(not has_table_privilege('anon', 'public.visitors', 'UPDATE'), 'anon cannot update visitors');
select ok(not has_table_privilege('anon', 'public.visitors', 'DELETE'), 'anon cannot delete visitors');

select ok(not has_table_privilege('anon', 'public.access_authorizations', 'SELECT'), 'anon cannot select access_authorizations');

select ok(not has_table_privilege('anon', 'public.access_events', 'SELECT'), 'anon cannot select access_events');
select ok(not has_table_privilege('anon', 'public.access_events', 'INSERT'), 'anon cannot insert access_events');

select ok(not has_table_privilege('anon', 'public.packages', 'SELECT'), 'anon cannot select packages');
select ok(not has_table_privilege('anon', 'public.packages', 'INSERT'), 'anon cannot insert packages');

-- Audit checks: verify audit_events contains gatehouse entries
-- Resident-safe visitor authorization: no catalog grant, scoped recent history, anti-enumeration.
reset role;
insert into public.visitors (id, condominium_id, full_name, document_type, document_number) values
  ('ca458100-0000-4000-8000-000000000099', 'c4581000-0000-4000-8000-000000000001', 'Visitante Unidade 102', 'other', 'HIDDEN123'),
  ('ca458200-0000-4000-8000-000000000099', 'c4582000-0000-4000-8000-000000000002', 'Visitante Beta', 'other', 'BETA123');
insert into public.access_authorizations (condominium_id, unit_id, visitor_id, authorized_by_person_id, authorized_by_user_account_id, valid_from, valid_until, status) values
  ('c4581000-0000-4000-8000-000000000001', 'e4581000-0000-4000-8000-000000000002', 'ca458100-0000-4000-8000-000000000099', 'b4581000-0000-4000-8000-000000000003', 'aa458100-0000-4000-8000-000000000003', now(), now() + interval '8 hours', 'approved'),
  ('c4582000-0000-4000-8000-000000000002', 'e4582000-0000-4000-8000-000000000001', 'ca458200-0000-4000-8000-000000000099', 'b4582000-0000-4000-8000-000000000004', 'aa458200-0000-4000-8000-000000000004', now(), now() + interval '8 hours', 'approved');

select ok(not exists (
  select 1 from public.role_permissions rp join public.roles r on r.id=rp.role_id join public.permissions p on p.id=rp.permission_id
  where r.code='condominium.resident' and p.code='visitors.read'
), 'resident role does not receive visitors.read');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a4581000-0000-4000-8000-000000000002', true);
select ok(
  not exists (
    select 1
    from public.visitors v
    where not (
      public.has_permission('access_authorizations.read', v.condominium_id)
      and (
        exists (
          select 1 from public.access_authorizations aa
          where aa.visitor_id = v.id
            and aa.condominium_id = v.condominium_id
            and public.is_unit_eligible_for_resident(aa.unit_id, aa.condominium_id)
        )
        or exists (
          select 1 from public.access_requests ar
          where ar.visitor_id = v.id
            and ar.condominium_id = v.condominium_id
            and public.has_permission('access_authorizations.read', ar.condominium_id)
            and public.is_unit_eligible_for_resident(ar.unit_id, ar.condominium_id)
        )
      )
    )
  )
  and not exists (
    select 1 from public.visitors
    where id in (
      'ca458100-0000-4000-8000-000000000099', -- Alpha, another unit
      'ca458200-0000-4000-8000-000000000099', -- Beta tenant
      'f458c000-0000-4000-8000-000000000003', -- no authorization
      'f458c000-0000-4000-8000-000000000004', -- another unit
      'f458c000-0000-4000-8000-000000000005'  -- Beta tenant
    )
  ),
  'resident sees only visitors justified by eligible authorization/request; negative controls stay hidden'
);
select ok(not exists(select 1 from public.get_resident_recent_visitors() where id='ca458100-0000-4000-8000-000000000099'), 'visitor exclusive to another unit is not recent');
select ok(not exists(select 1 from public.get_resident_recent_visitors() where id='ca458200-0000-4000-8000-000000000099'), 'other tenant visitor is not recent');

create temporary table p4_resident_visible_before(id uuid primary key);
insert into p4_resident_visible_before select id from public.visitors;
create temporary table p4_resident_auth(id uuid);
insert into p4_resident_auth select public.create_resident_visitor_authorization(
  'e4581000-0000-4000-8000-000000000001', now(), now() + interval '6 hours', null,
  'Novo Visitante Seguro', 'other', 'P4-ASSERT88-' || gen_random_uuid()::text, '+5511999990000', 'Criado pelo morador'
);
select is((select count(*) from p4_resident_auth), 1::bigint, 'eligible resident creates new visitor authorization');
select is((select count(*) from public.access_authorizations where id=(select id from p4_resident_auth) and unit_id='e4581000-0000-4000-8000-000000000001'), 1::bigint, 'authorization targets the eligible unit');
select ok(exists(select 1 from public.get_resident_recent_visitors() where full_name='Novo Visitante Seguro'), 'new visitor becomes recent for resident');
select ok(
  not exists (
    (select id from public.visitors except select id from p4_resident_visible_before)
    except
    (select aa.visitor_id from public.access_authorizations aa where aa.id = (select id from p4_resident_auth))
  )
  and not exists (
    (select aa.visitor_id from public.access_authorizations aa where aa.id = (select id from p4_resident_auth))
    except
    (select id from public.visitors except select id from p4_resident_visible_before)
  )
  and not exists (
    select 1 from public.visitors
    where id in (
      'ca458100-0000-4000-8000-000000000099',
      'ca458200-0000-4000-8000-000000000099',
      'f458c000-0000-4000-8000-000000000003',
      'f458c000-0000-4000-8000-000000000004',
      'f458c000-0000-4000-8000-000000000005'
    )
  )
  and not exists (
    select 1 from public.visitors v
    where not (
      public.has_permission('access_authorizations.read', v.condominium_id)
      and (
        exists (
          select 1 from public.access_authorizations aa
          where aa.visitor_id = v.id
            and aa.condominium_id = v.condominium_id
            and public.is_unit_eligible_for_resident(aa.unit_id, aa.condominium_id)
        )
        or exists (
          select 1 from public.access_requests ar
          where ar.visitor_id = v.id
            and ar.condominium_id = v.condominium_id
            and public.has_permission('access_authorizations.read', ar.condominium_id)
            and public.is_unit_eligible_for_resident(ar.unit_id, ar.condominium_id)
        )
      )
    )
  ),
  'RPC visibility delta is limited to its eligible authorization; negative controls stay hidden'
);

select set_config('request.jwt.claim.sub', 'a4581000-0000-4000-8000-000000000005', true);
select throws_ok(
  $$ select public.create_resident_visitor_authorization('e4581000-0000-4000-8000-000000000001',now(),now()+interval '1 hour',null,'Financeiro Bloqueado') $$,
  '42501', 'Unidade não autorizada', 'financial-only user cannot create visitor authorization'
);
select set_config('request.jwt.claim.sub', 'a4581000-0000-4000-8000-000000000002', true);
select throws_ok(
  $$ select public.create_resident_visitor_authorization('e4582000-0000-4000-8000-000000000001',now(),now()+interval '1 hour',null,'Cross Tenant') $$,
  '42501', 'Unidade não autorizada', 'cross-tenant unit is rejected'
);
select lives_ok(
  $$ select public.create_resident_visitor_authorization('e4581000-0000-4000-8000-000000000001',now(),now()+interval '2 hours',null,'Nome não revelador','other','HIDDEN-123') $$,
  'document match is reused internally without enumeration response'
);
select is((select count(*) from public.get_resident_recent_visitors() where id='ca458100-0000-4000-8000-000000000099'), 1::bigint, 'reused visitor appears only after authorization to eligible unit');

reset role;
select ok(exists (select 1 from public.audit_events where event_type = 'gatehouse.entry'), 'Audit event for entry logged');
select ok(exists (select 1 from public.audit_events where event_type = 'gatehouse.exit'), 'Audit event for exit logged');
select ok(exists (select 1 from public.audit_events where event_type = 'gatehouse.request_approved'), 'Audit event for request approval logged');
select ok(exists (select 1 from public.audit_events where event_type = 'gatehouse.package_collected'), 'Audit event for package collection logged');


select * from finish();
rollback;
