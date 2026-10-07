begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('91000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'profile-a@example.test', '', now(), now(), now()),
  ('91000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'profile-b@example.test', '', now(), now(), now()),
  ('91000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'profile-no-account@example.test', '', now(), now(), now());
insert into public.clients (id, legal_name)
values ('94000000-0000-4000-8000-000000000001', 'Profile test client');
insert into public.condominiums (id, client_id, name, status)
values ('95000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000001', 'Profile test condominium', 'active');
insert into public.people (id, full_name, preferred_name)
values
  ('92000000-0000-4000-8000-000000000001', 'Nome cadastral A', 'Nome antigo A'),
  ('92000000-0000-4000-8000-000000000002', 'Nome cadastral B', null);
insert into public.user_accounts (id, auth_user_id, person_id, status)
values
  ('93000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', 'active'),
  ('93000000-0000-4000-8000-000000000002', '91000000-0000-4000-8000-000000000002', '92000000-0000-4000-8000-000000000002', 'active');
insert into public.person_condominium_links (person_id, condominium_id, status)
values ('92000000-0000-4000-8000-000000000001', '95000000-0000-4000-8000-000000000001', 'active');
insert into public.condominium_memberships (id, condominium_id, user_account_id, status)
values ('97000000-0000-4000-8000-000000000001', '95000000-0000-4000-8000-000000000001', '93000000-0000-4000-8000-000000000001', 'active');

select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select is(public.update_my_display_name('  Nome novo A  '), 'Nome novo A', 'authenticated user trims and updates own display name');
select is((select preferred_name from public.people where id = '92000000-0000-4000-8000-000000000001'), 'Nome novo A', 'preferred_name is persisted');
select is((select full_name from public.people where id = '92000000-0000-4000-8000-000000000001'), 'Nome cadastral A', 'full_name remains unchanged');
select throws_ok($$select public.update_my_display_name('')$$, '22023', 'O nome de exibição deve ter entre 1 e 120 caracteres.', 'empty display name is rejected');
select throws_ok($$select public.update_my_display_name('   ')$$, '22023', 'O nome de exibição deve ter entre 1 e 120 caracteres.', 'blank display name is rejected');
select throws_ok($$select public.update_my_display_name(repeat('x', 121))$$, '22023', 'O nome de exibição deve ter entre 1 e 120 caracteres.', 'display name over 120 characters is rejected');

select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000003', true);
select throws_ok($$select public.update_my_display_name('Sem conta')$$, '42501', 'Conta de usuário não encontrada.', 'user without account is rejected');
select set_config('request.jwt.claim.sub', '', true);
select throws_ok($$select public.update_my_display_name('Sem autenticação')$$, '42501', 'Autenticação obrigatória.', 'unauthenticated call is rejected');
reset role;
select is((select proargnames from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'update_my_display_name' and p.pronargs = 1), array['p_preferred_name']::text[], 'RPC exposes only preferred_name parameter');
select is((select has_function_privilege('anon', 'public.update_my_display_name(text)', 'execute')), false, 'anon cannot execute display name RPC');
select * from finish();
rollback;
