begin;
create extension if not exists pgtap with schema extensions;
select plan(62);

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
  ('30000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'employee@example.test', '', now(), now(), now()),
  ('30000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'no-account@example.test', '', now(), now(), now());
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
insert into public.people (id, full_name, status) values
  ('40000000-0000-4000-8000-000000000005', 'Pessoa inativa de teste', 'inactive'),
  ('40000000-0000-4000-8000-000000000006', 'Pessoa anonimizada de teste', 'anonymized'),
  ('40000000-0000-4000-8000-000000000007', 'Pessoa arquivada legada', 'archived');
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
  ('70000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000003', (select id from public.roles where code = 'condominium.syndic'), '20000000-0000-4000-8000-000000000002'),
  ('70000000-0000-4000-8000-000000000005', '50000000-0000-4000-8000-000000000001', (select id from public.roles where code = 'condominium.resident_owner'), '20000000-0000-4000-8000-000000000001');

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code = 'condominium.syndic' and p.code = 'people.read';

select is((select count(*)::int from public.people where status = 'archived'), 1, 'legacy archived people status remains unchanged');
select is((select count(*)::int from public.people where status in ('inactive', 'anonymized')), 2, 'new people lifecycle states are accepted');
select ok((select is_nullable = 'YES' from information_schema.columns where table_schema = 'public' and table_name = 'people' and column_name = 'birth_date'), 'birth date is initially nullable');
select is((select count(*)::int from public.roles where scope_type is distinct from scope), 0, 'role scope_type is synchronized with legacy scope');
select throws_ok(
  $$update public.roles set scope = 'administrator', scope_type = 'platform' where code = 'condominium.syndic'$$,
  '23514', 'Role scope and scope_type must match', 'incoherent role scope_type is rejected');
select throws_ok(
  $$insert into public.condominium_memberships (condominium_id, user_account_id) values ('20000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001')$$,
  '23P01', 'Active membership periods may not overlap', 'overlapping active membership period is rejected');

update public.condominium_memberships
set status = 'ended', starts_at = now() - interval '2 days', ends_at = now() - interval '1 day'
where id = '60000000-0000-4000-8000-000000000001';
insert into public.condominium_memberships (id, condominium_id, user_account_id, starts_at)
values ('60000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', now());
select is((select count(*)::int from public.condominium_memberships where condominium_id = '20000000-0000-4000-8000-000000000001' and user_account_id = '50000000-0000-4000-8000-000000000001'), 2, 'ended membership history is retained beside a new period');

update public.condominium_memberships
set starts_at = now() - interval '2 days', ends_at = now() - interval '1 day'
where id = '60000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000002', true);
select ok(not public.has_condominium_access('20000000-0000-4000-8000-000000000002'), 'active but expired membership does not grant current access');
reset role;
insert into public.condominium_memberships (id, condominium_id, user_account_id, starts_at)
values ('60000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', now());
select is((select count(*)::int from public.condominium_memberships where condominium_id = '20000000-0000-4000-8000-000000000002' and user_account_id = '50000000-0000-4000-8000-000000000002'), 2, 'new period is allowed after an active but expired period');
update public.condominium_memberships set status = 'ended', starts_at = now() - interval '1 day', ends_at = now() where id = '60000000-0000-4000-8000-000000000006';

select throws_ok(
  $$insert into public.user_invitations (client_id, email, token_hash, expires_at, invitation_type) values ('10000000-0000-4000-8000-000000000001', 'invalid@example.test', 'hash-invalid-type', now() + interval '1 day', 'unknown')$$,
  '23514', null, 'unknown invitation type is rejected');
select throws_ok(
  $$insert into public.user_invitations (client_id, email, token_hash, expires_at, status) values ('10000000-0000-4000-8000-000000000001', 'invalid-status@example.test', 'hash-invalid-status', now() + interval '1 day', 'draft')$$,
  '23514', null, 'unknown invitation state is rejected');
select throws_ok(
  $$insert into public.user_invitations (client_id, email, token_hash, expires_at, invitation_type) values ('10000000-0000-4000-8000-000000000001', 'missing-scope@example.test', 'hash-missing-scope', now() + interval '1 day', 'condominium')$$,
  '23514', null, 'contextual invitation type requires a condominium scope');
select throws_ok(
  $$insert into public.user_invitations (client_id, email, token_hash, expires_at, invitation_type, condominium_id, platform_scope) values ('10000000-0000-4000-8000-000000000001', 'multi-scope@example.test', 'hash-multi-scope', now() + interval '1 day', 'condominium', '20000000-0000-4000-8000-000000000001', true)$$,
  '23514', null, 'invitation cannot carry inconsistent scopes');
insert into public.user_invitations (client_id, email, token_hash, expires_at, invitation_type, platform_scope)
values ('10000000-0000-4000-8000-000000000001', 'platform@example.test', 'hash-platform', now() + interval '1 day', 'platform', true);
select is((select count(*)::int from public.user_invitations where token_hash = 'hash-platform'), 1, 'valid platform invitation structure is accepted');

select throws_ok(
  $$insert into public.role_assignments (user_account_id, role_id, condominium_id) values ('50000000-0000-4000-8000-000000000001', (select id from public.roles where code = 'administrator.manager'), '20000000-0000-4000-8000-000000000001')$$,
  '23514', 'Role scope does not match assignment scope', 'role assignment scope mismatch is rejected');
select throws_ok(
  $$insert into public.role_permissions (role_id, permission_id) values ((select id from public.roles where code = 'condominium.syndic'), (select id from public.permissions where code = 'administrator.read'))$$,
  '23514', 'Permission scope does not match role scope', 'role permission scope mismatch is rejected');
select throws_ok(
  $$insert into public.permission_overrides (user_account_id, permission_id, condominium_id, effect, reason) values ('50000000-0000-4000-8000-000000000001', (select id from public.permissions where code = 'platform.manage'), '20000000-0000-4000-8000-000000000001', 'deny', 'Escopo inválido')$$,
  '23514', 'Permission scope does not match override scope', 'permission override scope mismatch is rejected');
select throws_ok(
  $$insert into public.role_equivalences (legacy_role_id, canonical_role_id) values ((select id from public.roles where code = 'administrator.manager'), (select id from public.roles where code = 'platform.admin'))$$,
  '23514', 'Role equivalence is reserved for explicit migration compatibility mappings', 'arbitrary role equivalence is rejected even for privileged migration execution');

set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(public.current_user_account_id(), '50000000-0000-4000-8000-000000000001'::uuid, 'auth user resolves to own active account');
select ok(public.has_condominium_access('20000000-0000-4000-8000-000000000001'), 'member has access to tenant A');
select ok(public.has_permission('condominiums.read', '20000000-0000-4000-8000-000000000001'), 'canonical P1 permission resolves the existing singular code');
select ok(public.has_permission('people.read_self', '20000000-0000-4000-8000-000000000001'), 'legacy resident role receives only its mapped self-read permission');
select ok(public.has_permission('people.read', '20000000-0000-4000-8000-000000000001'), 'explicit test grant permits people reads in tenant A');
select ok(not public.has_permission('people.read', '20000000-0000-4000-8000-000000000002'), 'people permission does not cross into tenant B');
select ok(not public.has_condominium_access('20000000-0000-4000-8000-000000000002'), 'member has no access to tenant B');
select ok(public.has_permission('condominium.read', '20000000-0000-4000-8000-000000000001'), 'syndic can read own condominium');
select ok(not public.has_permission('condominium.read', '20000000-0000-4000-8000-000000000002'), 'changing requested tenant does not grant access');
select is((select count(*)::int from public.condominiums), 1, 'RLS only returns tenant A');
select is((select count(*)::int from public.condominiums where id = '20000000-0000-4000-8000-000000000002'), 0, 'tenant B is hidden');
select is((select count(*)::int from public.clients), 0, 'commercial client table is closed');
select is((select count(*)::int from public.people), 2, 'people visibility is limited to own account and permitted tenant A');
select is((select count(*)::int from public.people where id = '40000000-0000-4000-8000-000000000002'), 0, 'tenant A cannot discover a person belonging only to tenant B');
select ok(not public.has_permission('access.read', '20000000-0000-4000-8000-000000000001'), 'permission absent from role is denied');
select ok(not public.has_permission('memberships.manage', '20000000-0000-4000-8000-000000000001'), 'new permission without a role grant is denied by default');
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000003', true);
select is((select count(*)::int from public.get_authorized_condominiums()), 2, 'multi-context account resolves both assigned condominiums');
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
select ok(public.record_user_login(), 'active linked account records a login');
reset role;
select throws_ok(
  $$insert into public.role_assignments (user_account_id, role_id, condominium_id) values ('50000000-0000-4000-8000-000000000001', (select id from public.roles where code = 'condominium.syndic'), '20000000-0000-4000-8000-000000000001')$$,
  '42501', 'Not authorized to assign a role to self', 'self-assignment without roles.assign is rejected by the actor trigger');
set local role authenticated;
select throws_ok($$select count(*) from public.audit_events$$, '42501', 'permission denied for table audit_events', 'audit log is not readable by ordinary authenticated users');

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
insert into public.permission_overrides (user_account_id, permission_id, condominium_id, effect, reason)
values ('50000000-0000-4000-8000-000000000001', (select id from public.permissions where code = 'roles.assign'), '20000000-0000-4000-8000-000000000001', 'allow', 'Grant temporário do teste de autoatribuição autorizada');
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
insert into public.role_assignments (user_account_id, role_id, condominium_id)
values ('50000000-0000-4000-8000-000000000001', (select id from public.roles where code = 'condominium.syndic'), '20000000-0000-4000-8000-000000000001');
select is((select count(*)::int from public.role_assignments where user_account_id = '50000000-0000-4000-8000-000000000001' and role_id = (select id from public.roles where code = 'condominium.syndic') and condominium_id = '20000000-0000-4000-8000-000000000001'), 2, 'self-assignment with roles.assign follows the authorized rule');
select throws_ok(
  $$insert into public.role_assignments (user_account_id, role_id, administrator_id) values ('50000000-0000-4000-8000-000000000001', (select id from public.roles where code = 'administrator.manager'), '80000000-0000-4000-8000-000000000001')$$,
  '42501', 'Not authorized to assign a role to self', 'self-assignment in an unauthorized cross-scope is rejected by the actor trigger');
select throws_ok(
  $$insert into public.role_assignments (user_account_id, role_id, condominium_id) values ('50000000-0000-4000-8000-000000000002', (select id from public.roles where code = 'administrator.manager'), '20000000-0000-4000-8000-000000000002')$$,
  '23514', 'Role scope does not match assignment scope', 'cross-scope assignment remains rejected independently of actor identity');

reset role;
select set_config('request.jwt.claim.sub', '', true);
insert into public.role_assignments (id, user_account_id, role_id, administrator_id)
values ('70000000-0000-4000-8000-000000000006', '50000000-0000-4000-8000-000000000004', (select id from public.roles where code = 'administrator.manager'), '80000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000004', true);
select is((select count(*)::int from public.get_authorized_administrators()), 1, 'administrator context is returned only after active role permission');
select ok(public.has_administrator_permission('administrator.read', '80000000-0000-4000-8000-000000000001'), 'administrator role grants scoped read permission end to end');
reset role;
insert into public.permission_overrides (user_account_id, permission_id, administrator_id, effect, reason)
values ('50000000-0000-4000-8000-000000000004', (select id from public.permissions where code = 'administrator.read'), '80000000-0000-4000-8000-000000000001', 'deny', 'Teste deny administrador');
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000004', true);
select ok(not public.has_administrator_permission('administrator.read', '80000000-0000-4000-8000-000000000001'), 'administrator deny override wins over role grant');
reset role;
select set_config('request.jwt.claim.sub', '', true);
insert into public.platform_memberships (user_account_id) values ('50000000-0000-4000-8000-000000000001');
insert into public.role_assignments (user_account_id, role_id, platform_scope)
values ('50000000-0000-4000-8000-000000000001', (select id from public.roles where code = 'platform.admin'), true);
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
select ok(public.has_platform_permission('platform.manage'), 'platform membership and role grant authorize the platform permission end to end');
reset role;
insert into public.permission_overrides (user_account_id, permission_id, platform_scope, effect, reason)
values ('50000000-0000-4000-8000-000000000001', (select id from public.permissions where code = 'platform.manage'), true, 'deny', 'Teste deny plataforma');
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
select ok(not public.has_platform_permission('platform.manage'), 'platform deny override wins over role grant');
select throws_ok(
  $$insert into public.role_equivalences (legacy_role_id, canonical_role_id) values ((select id from public.roles where code = 'administrator.manager'), (select id from public.roles where code = 'platform.admin'))$$,
  '42501', 'permission denied for table role_equivalences', 'application role cannot write role equivalences');
select throws_ok($$select count(*) from public.role_equivalences$$, '42501', 'permission denied for table role_equivalences', 'application role cannot read role equivalences');
select throws_ok($$select count(*) from public.permission_equivalences$$, '42501', 'permission denied for table permission_equivalences', 'application role cannot read permission equivalences');
reset role;
update public.condominium_memberships set status = 'ended', starts_at = now() - interval '2 days', ends_at = now() - interval '1 day' where user_account_id = '50000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000002', true);
select ok(not public.has_condominium_access('20000000-0000-4000-8000-000000000002'), 'ended membership no longer grants current access');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000005', true);
select is(public.current_user_account_id(), null::uuid, 'authenticated user without a CondoVia account resolves to no account');
select ok(not public.has_condominium_access('20000000-0000-4000-8000-000000000001'), 'user without a CondoVia account cannot access tenant data');
reset role;
update public.user_accounts set status = 'closed' where id = '50000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
select is(public.current_user_account_id(), null::uuid, 'legacy closed account remains closed and has no operational access');
reset role;
update public.user_accounts set status = 'active' where id = '50000000-0000-4000-8000-000000000001';
update public.user_accounts set status = 'disabled' where id = '50000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
select is(public.current_user_account_id(), null::uuid, 'disabled account has no operational access');
reset role;
update public.condominium_memberships set status = 'suspended' where user_account_id = '50000000-0000-4000-8000-000000000001';
update public.user_accounts set status = 'active' where id = '50000000-0000-4000-8000-000000000001';
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
