begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

-- The local Supabase test runner supplies auth.uid() and the authenticated role.
insert into public.clients (id, legal_name) values
  ('10000000-0000-4000-8000-000000000001', 'Cliente de teste');
insert into public.condominiums (id, client_id, name) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Condomínio A'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Condomínio B');

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('30000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'a@example.test', '', now(), now(), now()),
  ('30000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'b@example.test', '', now(), now(), now()),
  ('30000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'multi@example.test', '', now(), now(), now()),
  ('30000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'employee@example.test', '', now(), now(), now());
insert into public.people (id, full_name) values
  ('40000000-0000-4000-8000-000000000001', 'Síndico A'),
  ('40000000-0000-4000-8000-000000000002', 'Síndico B'),
  ('40000000-0000-4000-8000-000000000003', 'Usuário multi-contexto'),
  ('40000000-0000-4000-8000-000000000004', 'Funcionário da administradora');
insert into public.user_accounts (id, auth_user_id, person_id) values
  ('50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001'),
  ('50000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002'),
  ('50000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003'),
  ('50000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000004');
insert into public.administrators (id, client_id, legal_name) values
  ('80000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Administradora de teste');
insert into public.administrator_memberships (administrator_id, user_account_id)
values ('80000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000004');
insert into public.administrator_condominium_access (administrator_id, condominium_id)
values ('80000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001');
insert into public.condominium_memberships (id, condominium_id, user_account_id) values
  ('60000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001'),
  ('60000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002'),
  ('60000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000003'),
  ('60000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000003');
insert into public.role_assignments (id, user_account_id, role_id, condominium_id) values
  ('70000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', (select id from public.roles where code = 'condominium.syndic'), '20000000-0000-4000-8000-000000000001'),
  ('70000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', (select id from public.roles where code = 'condominium.syndic'), '20000000-0000-4000-8000-000000000002'),
  ('70000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000003', (select id from public.roles where code = 'condominium.syndic'), '20000000-0000-4000-8000-000000000001'),
  ('70000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000003', (select id from public.roles where code = 'condominium.syndic'), '20000000-0000-4000-8000-000000000002');

select throws_ok(
  $$insert into public.role_assignments (user_account_id, role_id, condominium_id) values ('50000000-0000-4000-8000-000000000001', (select id from public.roles where code = 'administrator.manager'), '20000000-0000-4000-8000-000000000001')$$,
  '23514', 'Role scope does not match assignment scope', 'role assignment scope mismatch is rejected');
select throws_ok(
  $$insert into public.role_permissions (role_id, permission_id) values ((select id from public.roles where code = 'condominium.syndic'), (select id from public.permissions where code = 'administrator.read'))$$,
  '23514', 'Permission scope does not match role scope', 'role permission scope mismatch is rejected');
select throws_ok(
  $$insert into public.permission_overrides (user_account_id, permission_id, condominium_id, effect, reason) values ('50000000-0000-4000-8000-000000000001', (select id from public.permissions where code = 'platform.manage'), '20000000-0000-4000-8000-000000000001', 'deny', 'Escopo inválido')$$,
  '23514', 'Permission scope does not match override scope', 'permission override scope mismatch is rejected');

set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(public.current_user_account_id(), '50000000-0000-4000-8000-000000000001'::uuid, 'auth user resolves to own active account');
select ok(public.has_condominium_access('20000000-0000-4000-8000-000000000001'), 'member has access to tenant A');
select ok(not public.has_condominium_access('20000000-0000-4000-8000-000000000002'), 'member has no access to tenant B');
select ok(public.has_permission('condominium.read', '20000000-0000-4000-8000-000000000001'), 'syndic can read own condominium');
select ok(not public.has_permission('condominium.read', '20000000-0000-4000-8000-000000000002'), 'changing requested tenant does not grant access');
select is((select count(*)::int from public.condominiums), 1, 'RLS only returns tenant A');
select is((select count(*)::int from public.condominiums where id = '20000000-0000-4000-8000-000000000002'), 0, 'tenant B is hidden');
select is((select count(*)::int from public.clients), 0, 'commercial client table is closed');
select is((select count(*)::int from public.people), 1, 'person data is limited to own account');
select ok(not public.has_permission('access.read', '20000000-0000-4000-8000-000000000001'), 'permission absent from role is denied');
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000003', true);
select is((select count(*)::int from public.get_authorized_condominiums()), 2, 'multi-context account resolves both assigned condominiums');
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);

reset role;
insert into public.permission_overrides (user_account_id, permission_id, condominium_id, effect, reason)
values ('50000000-0000-4000-8000-000000000001', (select id from public.permissions where code = 'condominium.read'), '20000000-0000-4000-8000-000000000001', 'deny', 'Teste de precedência deny');
set local role authenticated;
select ok(not public.has_permission('condominium.read', '20000000-0000-4000-8000-000000000001'), 'deny override wins over role allow');
select ok(public.has_permission('dashboard.read', '20000000-0000-4000-8000-000000000001'), 'unoverridden permission remains allowed');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000004', true);
select ok(public.has_administrator_access('80000000-0000-4000-8000-000000000001'), 'employee is linked to the administrator');
select ok(not public.has_condominium_access('20000000-0000-4000-8000-000000000001'), 'administrator employee without condo assignment cannot access a managed condo');
select ok(not public.has_permission('condominium.read', '20000000-0000-4000-8000-000000000001'), 'administrator membership alone grants no condo permission');
reset role;
update public.condominium_memberships set status = 'suspended' where user_account_id = '50000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
select ok(not public.has_condominium_access('20000000-0000-4000-8000-000000000001'), 'suspended condominium membership blocks an otherwise active role');
reset role;
update public.user_accounts set status = 'suspended' where id = '50000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
select is(public.current_user_account_id(), null::uuid, 'suspended user account does not resolve');
select ok(not public.has_condominium_access('20000000-0000-4000-8000-000000000001'), 'suspended account has no operational tenant access');

reset role;
select * from finish();
rollback;
