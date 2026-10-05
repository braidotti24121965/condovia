create extension if not exists pgtap with schema extensions;
begin;
select plan(7);

-- Dedicated deterministic namespace for this isolated RLS test. Every row is
-- inside this transaction and removed by ROLLBACK; no pre-existing fixture is
-- updated, deleted, or reused.
insert into public.clients (id, legal_name) values
  ('f457c100-0000-4000-8000-000000000001', 'P4.5.7D Alpha Test Client'),
  ('f457c100-0000-4000-8000-000000000002', 'P4.5.7D Beta Test Client');

insert into public.condominiums (id, client_id, name, timezone) values
  ('f457c200-0000-4000-8000-000000000001', 'f457c100-0000-4000-8000-000000000001', 'P4.5.7D Alpha', 'America/Sao_Paulo'),
  ('f457c200-0000-4000-8000-000000000002', 'f457c100-0000-4000-8000-000000000002', 'P4.5.7D Beta', 'America/Sao_Paulo');

insert into public.condominium_structures (id, condominium_id, name, structure_type) values
  ('f457c300-0000-4000-8000-000000000001', 'f457c200-0000-4000-8000-000000000001', 'Alpha Tower', 'tower'),
  ('f457c300-0000-4000-8000-000000000002', 'f457c200-0000-4000-8000-000000000002', 'Beta Tower', 'tower');

insert into public.units (id, condominium_id, structure_id, code, unit_type) values
  ('f457c400-0000-4000-8000-000000000101', 'f457c200-0000-4000-8000-000000000001', 'f457c300-0000-4000-8000-000000000001', '101', 'apartment'),
  ('f457c400-0000-4000-8000-000000000102', 'f457c200-0000-4000-8000-000000000001', 'f457c300-0000-4000-8000-000000000001', '102', 'apartment'),
  ('f457c400-0000-4000-8000-000000000201', 'f457c200-0000-4000-8000-000000000002', 'f457c300-0000-4000-8000-000000000002', '201', 'apartment');

insert into public.people (id, full_name, status) values
  ('f457c500-0000-4000-8000-000000000001', 'P4.5.7D Resident 101', 'active'),
  ('f457c500-0000-4000-8000-000000000002', 'P4.5.7D Resident 102', 'active'),
  ('f457c500-0000-4000-8000-000000000003', 'P4.5.7D Financial Only', 'active'),
  ('f457c500-0000-4000-8000-000000000004', 'P4.5.7D Alpha Doorman', 'active');

insert into public.person_condominium_links (person_id, condominium_id, status) values
  ('f457c500-0000-4000-8000-000000000001', 'f457c200-0000-4000-8000-000000000001', 'active'),
  ('f457c500-0000-4000-8000-000000000002', 'f457c200-0000-4000-8000-000000000001', 'active'),
  ('f457c500-0000-4000-8000-000000000003', 'f457c200-0000-4000-8000-000000000001', 'active'),
  ('f457c500-0000-4000-8000-000000000004', 'f457c200-0000-4000-8000-000000000001', 'active');

insert into auth.users (id, email) values
  ('f457c600-0000-4000-8000-000000000001', 'resident101@p457d.condovia.local'),
  ('f457c600-0000-4000-8000-000000000002', 'resident102@p457d.condovia.local'),
  ('f457c600-0000-4000-8000-000000000003', 'financial@p457d.condovia.local'),
  ('f457c600-0000-4000-8000-000000000004', 'doorman@p457d.condovia.local');

insert into public.user_accounts (id, auth_user_id, person_id, status) values
  ('f457c700-0000-4000-8000-000000000001', 'f457c600-0000-4000-8000-000000000001', 'f457c500-0000-4000-8000-000000000001', 'active'),
  ('f457c700-0000-4000-8000-000000000002', 'f457c600-0000-4000-8000-000000000002', 'f457c500-0000-4000-8000-000000000002', 'active'),
  ('f457c700-0000-4000-8000-000000000003', 'f457c600-0000-4000-8000-000000000003', 'f457c500-0000-4000-8000-000000000003', 'active'),
  ('f457c700-0000-4000-8000-000000000004', 'f457c600-0000-4000-8000-000000000004', 'f457c500-0000-4000-8000-000000000004', 'active');

insert into public.condominium_memberships (condominium_id, user_account_id, status) values
  ('f457c200-0000-4000-8000-000000000001', 'f457c700-0000-4000-8000-000000000001', 'active'),
  ('f457c200-0000-4000-8000-000000000001', 'f457c700-0000-4000-8000-000000000002', 'active'),
  ('f457c200-0000-4000-8000-000000000001', 'f457c700-0000-4000-8000-000000000003', 'active'),
  ('f457c200-0000-4000-8000-000000000001', 'f457c700-0000-4000-8000-000000000004', 'active');

insert into public.role_assignments (user_account_id, role_id, condominium_id)
select fixture.user_account_id, r.id, 'f457c200-0000-4000-8000-000000000001'
from (values
  ('f457c700-0000-4000-8000-000000000001'::uuid, 'condominium.resident'),
  ('f457c700-0000-4000-8000-000000000002'::uuid, 'condominium.resident'),
  ('f457c700-0000-4000-8000-000000000003'::uuid, 'condominium.resident'),
  ('f457c700-0000-4000-8000-000000000004'::uuid, 'condominium.doorman')
) as fixture(user_account_id, role_code)
join public.roles r on r.code = fixture.role_code;

insert into public.unit_occupancies (condominium_id, unit_id, person_id, occupancy_type, is_primary, starts_at) values
  ('f457c200-0000-4000-8000-000000000001', 'f457c400-0000-4000-8000-000000000101', 'f457c500-0000-4000-8000-000000000001', 'tenant', true, current_date - 1),
  ('f457c200-0000-4000-8000-000000000001', 'f457c400-0000-4000-8000-000000000102', 'f457c500-0000-4000-8000-000000000002', 'tenant', true, current_date - 1);

insert into public.unit_financial_responsibilities (condominium_id, unit_id, person_id, starts_at) values
  ('f457c200-0000-4000-8000-000000000001', 'f457c400-0000-4000-8000-000000000101', 'f457c500-0000-4000-8000-000000000003', current_date - 1);

insert into public.visitors (id, condominium_id, full_name) values
  ('f457c800-0000-4000-8000-000000000001', 'f457c200-0000-4000-8000-000000000001', 'Visitor for Unit 101'),
  ('f457c800-0000-4000-8000-000000000002', 'f457c200-0000-4000-8000-000000000001', 'Visitor for Unit 102'),
  ('f457c800-0000-4000-8000-000000000003', 'f457c200-0000-4000-8000-000000000002', 'Visitor for Beta'),
  ('f457c800-0000-4000-8000-000000000004', 'f457c200-0000-4000-8000-000000000001', 'Visitor without authorization'),
  ('f457c800-0000-4000-8000-000000000005', 'f457c200-0000-4000-8000-000000000001', 'Visitor with request for Unit 101'),
  ('f457c800-0000-4000-8000-000000000006', 'f457c200-0000-4000-8000-000000000001', 'Visitor with request for Unit 102'),
  ('f457c800-0000-4000-8000-000000000007', 'f457c200-0000-4000-8000-000000000002', 'Visitor with request for Beta');

insert into public.access_authorizations (
  id, condominium_id, unit_id, visitor_id, authorized_by_person_id,
  valid_from, valid_until, status
) values
  ('f457c900-0000-4000-8000-000000000001', 'f457c200-0000-4000-8000-000000000001', 'f457c400-0000-4000-8000-000000000101', 'f457c800-0000-4000-8000-000000000001', 'f457c500-0000-4000-8000-000000000001', now() - interval '1 hour', now() + interval '8 hours', 'approved'),
  ('f457c900-0000-4000-8000-000000000002', 'f457c200-0000-4000-8000-000000000001', 'f457c400-0000-4000-8000-000000000102', 'f457c800-0000-4000-8000-000000000002', 'f457c500-0000-4000-8000-000000000002', now() - interval '1 hour', now() + interval '8 hours', 'approved'),
  ('f457c900-0000-4000-8000-000000000003', 'f457c200-0000-4000-8000-000000000002', 'f457c400-0000-4000-8000-000000000201', 'f457c800-0000-4000-8000-000000000003', 'f457c500-0000-4000-8000-000000000001', now() - interval '1 hour', now() + interval '8 hours', 'approved');

insert into public.access_requests (
  id, condominium_id, unit_id, visitor_id, requested_by_user_account_id, status, notes
) values
  ('f457ca00-0000-4000-8000-000000000001', 'f457c200-0000-4000-8000-000000000001', 'f457c400-0000-4000-8000-000000000101', 'f457c800-0000-4000-8000-000000000005', 'f457c700-0000-4000-8000-000000000004', 'pending', 'Q1 own unit request'),
  ('f457ca00-0000-4000-8000-000000000002', 'f457c200-0000-4000-8000-000000000001', 'f457c400-0000-4000-8000-000000000102', 'f457c800-0000-4000-8000-000000000006', 'f457c700-0000-4000-8000-000000000004', 'pending', 'Q2 other unit request'),
  ('f457ca00-0000-4000-8000-000000000003', 'f457c200-0000-4000-8000-000000000002', 'f457c400-0000-4000-8000-000000000201', 'f457c800-0000-4000-8000-000000000007', 'f457c700-0000-4000-8000-000000000004', 'pending', 'Q3 Beta request');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f457c600-0000-4000-8000-000000000001', true);
select is((select full_name from public.visitors where id = 'f457c800-0000-4000-8000-000000000005'), 'Visitor with request for Unit 101', 'Q1 resident can read visitor from own unit pending request');
select is((select count(*) from public.visitors where id = 'f457c800-0000-4000-8000-000000000006'), 0::bigint, 'Q2 resident cannot read visitor from another unit request');
select is((select count(*) from public.visitors where id = 'f457c800-0000-4000-8000-000000000007'), 0::bigint, 'Q3 Alpha resident cannot read visitor from Beta request');
select is((select count(*) from public.visitors where id = 'f457c800-0000-4000-8000-000000000004'), 0::bigint, 'Q4 resident cannot read visitor without request or authorization');

select set_config('request.jwt.claim.sub', 'f457c600-0000-4000-8000-000000000003', true);
select is((select count(*) from public.visitors where id = 'f457c800-0000-4000-8000-000000000005'), 0::bigint, 'Q5 financial-only user cannot read visitor without unit access');

select set_config('request.jwt.claim.sub', 'f457c600-0000-4000-8000-000000000004', true);
select is((select full_name from public.visitors where id = 'f457c800-0000-4000-8000-000000000005'), 'Visitor with request for Unit 101', 'Q6 doorman retains visitors.read access');

select set_config('request.jwt.claim.sub', 'f457c600-0000-4000-8000-000000000001', true);
select is((select full_name from public.visitors where id = 'f457c800-0000-4000-8000-000000000001'), 'Visitor for Unit 101', 'Q7 resident retains authorization-linked visitor visibility');

reset role;
select * from finish();
rollback;
