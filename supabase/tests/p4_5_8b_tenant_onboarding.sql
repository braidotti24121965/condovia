create extension if not exists pgtap with schema extensions;
select plan(20);

begin;

insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at) values
  ('458b0000-0000-4000-8000-000000000001','authenticated','authenticated','p458b-platform@example.test','',now(),now(),now());
insert into public.people(id,full_name,status) values
  ('458b0000-0000-4000-8000-000000000002','P4.5.8B Platform Admin','active');
insert into public.user_accounts(id,auth_user_id,person_id,status) values
  ('458b0000-0000-4000-8000-000000000003','458b0000-0000-4000-8000-000000000001','458b0000-0000-4000-8000-000000000002','active');
insert into public.platform_memberships(user_account_id,status) values
  ('458b0000-0000-4000-8000-000000000003','active');
insert into public.role_assignments(user_account_id,role_id,platform_scope,status)
select '458b0000-0000-4000-8000-000000000003',r.id,true,'active'
from public.roles r where r.code='platform.admin';

select set_config('request.jwt.claim.sub','458b0000-0000-4000-8000-000000000001',true);
select ok(public.has_platform_permission('platform.tenants.onboard'),'test actor has tenant onboarding permission');

savepoint before_onboarding;

insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at) values
  ('458b0000-0000-4000-8000-000000000004','authenticated','authenticated','p458b-syndic@example.test','',now(),now(),now());

select lives_ok($$
  create temp table p458b_onboarding_result on commit drop as
  select * from public.create_tenant_with_initial_admin(
    'P4.5.8B Test Client', 'P4.5.8B Test Condominium', 'P4.5.8B Test Legal Name',
    '11.222.333/0001-81', 'condominium@example.test', '+55 11 4000-0000', 'horizontal',
    'America/Sao_Paulo', '01310-100', 'Avenida de Teste', '100', 'Bloco Teste',
    'Bairro Teste', 'São Paulo', 'SP', 'BR', 'P4.5.8B Initial Syndic',
    'p458b-syndic@example.test', '+55 11 99999-0000',
    pg_catalog.encode(extensions.digest(repeat('a',64),'sha256'),'hex')
  )
$$,'corrected tenant onboarding RPC executes without PostgreSQL 42883');

select ok(exists(select 1 from public.clients where legal_name='P4.5.8B Test Client' and status='active'),'client is created');
select ok(exists(
  select 1 from public.condominiums c join p458b_onboarding_result r on r.condominium_id=c.id
  where c.name='P4.5.8B Test Condominium' and c.legal_name='P4.5.8B Test Legal Name'
    and c.document_number='11222333000181' and c.email='condominium@example.test'
    and c.phone='+551140000000' and c.condominium_type='horizontal'
    and c.timezone='America/Sao_Paulo' and c.status='active'
),'condominium persists essential RPC fields');
select ok(exists(
  select 1 from public.addresses a join public.condominiums c on c.address_id=a.id
  join p458b_onboarding_result r on r.condominium_id=c.id
  where a.postal_code='01310100' and a.street='Avenida de Teste' and a.number='100'
    and a.complement='Bloco Teste' and a.district='Bairro Teste'
    and a.city='São Paulo' and a.state='SP' and a.country_code='BR'
),'address fields are persisted');
select ok(exists(
  select 1 from public.people p join public.person_emails e on e.person_id=p.id
  join public.person_phones ph on ph.person_id=p.id
  where p.full_name='P4.5.8B Initial Syndic' and p.status='active'
    and e.normalized_email='p458b-syndic@example.test' and e.is_primary
    and ph.phone_e164='+5511999990000' and ph.is_primary
),'initial administrator identity and contacts are created');
select ok(exists(
  select 1 from public.person_condominium_links l
  join public.people p on p.id=l.person_id
  join p458b_onboarding_result r on r.condominium_id=l.condominium_id
  where p.full_name='P4.5.8B Initial Syndic' and l.status='active'
),'initial administrator is linked to the condominium');
select ok(exists(
  select 1 from public.user_invitations i join p458b_onboarding_result r on r.invitation_id=i.id
  where i.status='pending' and i.invitation_type='condominium_admin'
    and i.email='p458b-syndic@example.test' and i.condominium_id=r.condominium_id
),'pending condominium admin invitation is created');
select ok(exists(
  select 1 from public.audit_events a join p458b_onboarding_result r on r.invitation_id=a.entity_id
  where a.event_type='tenant.onboarding_created' and a.metadata->>'role'='condominium.syndic'
),'onboarding audit records the expected syndic role');

select set_config('request.jwt.claim.sub','458b0000-0000-4000-8000-000000000004',true);
select lives_ok($$select public.accept_initial_condominium_admin_invitation(repeat('a',64))$$,'initial administrator accepts the invitation');
select ok(exists(
  select 1 from public.user_accounts ua join public.people p on p.id=ua.person_id
  where ua.auth_user_id='458b0000-0000-4000-8000-000000000004' and ua.status='active'
    and p.full_name='P4.5.8B Initial Syndic'
),'accepted administrator account is active');
select ok(exists(
  select 1 from public.condominium_memberships m
  join public.user_accounts ua on ua.id=m.user_account_id
  join p458b_onboarding_result r on r.condominium_id=m.condominium_id
  where ua.auth_user_id='458b0000-0000-4000-8000-000000000004' and m.status='active'
),'accepted administrator receives an active condominium membership');
select ok(exists(
  select 1 from public.role_assignments ra
  join public.user_accounts ua on ua.id=ra.user_account_id
  join public.roles ro on ro.id=ra.role_id
  join p458b_onboarding_result r on r.condominium_id=ra.condominium_id
  where ua.auth_user_id='458b0000-0000-4000-8000-000000000004'
    and ro.code='condominium.syndic' and ra.status='active'
),'accepted administrator receives condominium.syndic');
select ok(exists(
  select 1 from public.user_invitations i join p458b_onboarding_result r on r.invitation_id=i.id
  where i.status='accepted' and i.accepted_at is not null
),'invitation is marked accepted');

rollback to savepoint before_onboarding;

select ok(not exists(select 1 from public.clients where legal_name='P4.5.8B Test Client'),'rollback removes the client');
select ok(not exists(select 1 from public.condominiums where name='P4.5.8B Test Condominium'),'rollback removes the condominium');
select ok(not exists(select 1 from public.addresses where street='Avenida de Teste' and city='São Paulo'),'rollback removes the address');
select ok(not exists(select 1 from public.people where full_name='P4.5.8B Initial Syndic'),'rollback removes the initial administrator');
select ok(not exists(select 1 from public.user_invitations where email='p458b-syndic@example.test'),'rollback removes the invitation');
select ok(not exists(
  select 1 from public.user_accounts ua where ua.auth_user_id='458b0000-0000-4000-8000-000000000004'
),'rollback removes the accepted administrator account and dependent access');

select * from finish();
rollback;
