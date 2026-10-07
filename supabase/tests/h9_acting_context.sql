begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

insert into public.clients(id, legal_name)
values ('a9000000-0000-4000-8000-000000000001', 'H9 Client');
insert into public.condominiums(id, client_id, name, status)
values
  ('a9000000-0000-4000-8000-000000000002', 'a9000000-0000-4000-8000-000000000001', 'H9 Village', 'active'),
  ('a9000000-0000-4000-8000-000000000003', 'a9000000-0000-4000-8000-000000000001', 'H9 Other', 'active'),
  ('a9000000-0000-4000-8000-000000000004', 'a9000000-0000-4000-8000-000000000001', 'H9 Inactive', 'suspended');
insert into auth.users(id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('a9000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'h9-platform@example.test', '', now(), now(), now());
insert into public.people(id, full_name) values ('a9000000-0000-4000-8000-000000000006', 'H9 Platform Admin');
insert into public.user_accounts(id, auth_user_id, person_id, status)
values ('a9000000-0000-4000-8000-000000000007', 'a9000000-0000-4000-8000-000000000005', 'a9000000-0000-4000-8000-000000000006', 'active');
insert into public.platform_memberships(user_account_id, status)
values ('a9000000-0000-4000-8000-000000000007', 'active');
insert into public.role_assignments(user_account_id, role_id, platform_scope, status)
select 'a9000000-0000-4000-8000-000000000007', id, true, 'active'
from public.roles where code = 'platform.admin';
insert into auth.sessions(id, user_id, aal, not_after, refreshed_at, created_at, updated_at)
values ('a9000000-0000-4000-8000-000000000008', 'a9000000-0000-4000-8000-000000000005', 'aal1', now() + interval '1 hour', now(), now(), now());

select set_config('request.jwt.claim.sub', 'a9000000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', json_build_object('sub', 'a9000000-0000-4000-8000-000000000005', 'role', 'authenticated', 'session_id', 'a9000000-0000-4000-8000-000000000008')::text, true);

select ok(public.current_auth_session_is_valid(), 'current JWT session is valid');
select ok(exists(select 1 from public.platform_memberships where user_account_id = 'a9000000-0000-4000-8000-000000000007' and status = 'active'), 'platform membership is active');
select ok(exists(select 1 from public.role_assignments ra join public.roles r on r.id = ra.role_id where ra.user_account_id = 'a9000000-0000-4000-8000-000000000007' and r.code = 'platform.admin' and ra.platform_scope and ra.status = 'active'), 'platform.admin assignment is active');
select ok(public.has_platform_permission('platform.manage'), 'platform.manage is effective');
select lives_ok($$select public.begin_platform_tenant_context('a9000000-0000-4000-8000-000000000002')$$, 'platform admin can begin valid context');
select ok(exists(select 1 from public.platform_acting_contexts where auth_session_id = 'a9000000-0000-4000-8000-000000000008' and condominium_id = 'a9000000-0000-4000-8000-000000000002' and ended_at is null), 'valid context is stored for the session');
select ok(public.has_permission('structures.read', 'a9000000-0000-4000-8000-000000000002'), 'tenant permission passes in acting context');
select ok(not public.has_permission('structures.read', 'a9000000-0000-4000-8000-000000000003'), 'different tenant is denied');
select throws_ok($$select public.begin_platform_tenant_context('a9000000-0000-4000-8000-000000000004')$$, '42501', null, 'inactive tenant is denied');
select is(public.end_platform_tenant_context(), true, 'acting context can be ended');
select ok(not public.has_permission('structures.read', 'a9000000-0000-4000-8000-000000000002'), 'ended context denies tenant permission');
select ok(exists(select 1 from public.audit_events where entity_type = 'platform_acting_context' and event_type = 'platform.tenant_context.enter'), 'enter audit event exists');
select ok(exists(select 1 from public.audit_events where entity_type = 'platform_acting_context' and event_type = 'platform.tenant_context.exit'), 'exit audit event exists');

select set_config('request.jwt.claims', json_build_object('sub', 'a9000000-0000-4000-8000-000000000005', 'role', 'authenticated', 'session_id', 'a9000000-0000-4000-8000-000000000009')::text, true);
select set_config('request.jwt.claim.sub', 'a9000000-0000-4000-8000-000000000005', true);
select ok(not public.current_auth_session_is_valid(), 'unknown session is denied');
select ok(not public.has_permission('structures.read', 'a9000000-0000-4000-8000-000000000002'), 'unknown session cannot use context');

select set_config('request.jwt.claims', json_build_object('sub', 'a9000000-0000-4000-8000-000000000005', 'role', 'authenticated', 'session_id', 'not-a-uuid')::text, true);
select is(public.current_auth_session_id(), null, 'invalid client claim becomes null');
select ok(not public.current_auth_session_is_valid(), 'invalid session claim is denied');
select throws_ok($$select public.begin_platform_tenant_context('a9000000-0000-4000-8000-000000000002')$$, '42501', null, 'invalid session claim cannot begin context');
select ok(not exists(select 1 from public.platform_acting_contexts where ended_at is null), 'no open context remains after invalid-session checks');
select ok(not public.has_permission('structures.read', 'a9000000-0000-4000-8000-000000000002'), 'invalid session cannot access tenant permission');

select * from finish();
rollback;
