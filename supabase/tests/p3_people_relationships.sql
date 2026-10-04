create extension if not exists pgtap with schema extensions;
select plan(174);
begin;
insert into public.clients(id,legal_name) values ('b1000000-0000-4000-8000-000000000001','P3 test client');
insert into public.condominiums(id,client_id,name,timezone) values
 ('b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','P3 Condo A','America/Sao_Paulo'),
 ('b2000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000001','P3 Condo B','America/Sao_Paulo');
insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at) values
 ('b3000000-0000-4000-8000-000000000001','authenticated','authenticated','p3-syndic-a@example.test','',now(),now(),now()),
 ('b3000000-0000-4000-8000-000000000002','authenticated','authenticated','p3-syndic-b@example.test','',now(),now(),now()),
 ('b3000000-0000-4000-8000-000000000003','authenticated','authenticated','p3-resident@example.test','',now(),now(),now()),
 ('b3000000-0000-4000-8000-000000000004','authenticated','authenticated','p3-doorman@example.test','',now(),now(),now()),
 ('b3000000-0000-4000-8000-000000000005','authenticated','authenticated','p3-existing-resident@example.test','',now(),now(),now());
insert into public.people(id,full_name) values
 ('b4000000-0000-4000-8000-000000000001','Síndico P3 A'),('b4000000-0000-4000-8000-000000000002','Síndico P3 B'),
 ('b4000000-0000-4000-8000-000000000003','Morador P3'),('b4000000-0000-4000-8000-000000000004','Porteiro P3'),('b4000000-0000-4000-8000-000000000005','Pessoa privada B'),
 ('b4000000-0000-4000-8000-000000000006','Morador com conta preexistente'),('b4000000-0000-4000-8000-000000000007','Responsável apenas financeiro');
insert into public.user_accounts(id,auth_user_id,person_id) values
 ('b5000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001'),
 ('b5000000-0000-4000-8000-000000000002','b3000000-0000-4000-8000-000000000002','b4000000-0000-4000-8000-000000000002'),
 ('b5000000-0000-4000-8000-000000000003','b3000000-0000-4000-8000-000000000003','b4000000-0000-4000-8000-000000000003'),
 ('b5000000-0000-4000-8000-000000000004','b3000000-0000-4000-8000-000000000004','b4000000-0000-4000-8000-000000000004'),
 ('b5000000-0000-4000-8000-000000000005','b3000000-0000-4000-8000-000000000005','b4000000-0000-4000-8000-000000000006');
insert into public.condominium_memberships(id,condominium_id,user_account_id) values
 ('b6000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','b5000000-0000-4000-8000-000000000001'),
 ('b6000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000002','b5000000-0000-4000-8000-000000000002'),
 ('b6000000-0000-4000-8000-000000000003','b2000000-0000-4000-8000-000000000001','b5000000-0000-4000-8000-000000000003'),
 ('b6000000-0000-4000-8000-000000000004','b2000000-0000-4000-8000-000000000001','b5000000-0000-4000-8000-000000000004');
insert into public.role_assignments(id,user_account_id,role_id,condominium_id) values
 ('b7000000-0000-4000-8000-000000000001','b5000000-0000-4000-8000-000000000001',(select id from public.roles where code='condominium.syndic'),'b2000000-0000-4000-8000-000000000001'),
 ('b7000000-0000-4000-8000-000000000002','b5000000-0000-4000-8000-000000000002',(select id from public.roles where code='condominium.syndic'),'b2000000-0000-4000-8000-000000000002'),
 ('b7000000-0000-4000-8000-000000000003','b5000000-0000-4000-8000-000000000003',(select id from public.roles where code='condominium.resident'),'b2000000-0000-4000-8000-000000000001'),
 ('b7000000-0000-4000-8000-000000000004','b5000000-0000-4000-8000-000000000004',(select id from public.roles where code='condominium.doorman'),'b2000000-0000-4000-8000-000000000001');
insert into public.person_condominium_links(person_id,condominium_id) values
 ('b4000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001'),
 ('b4000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000002'),
 ('b4000000-0000-4000-8000-000000000003','b2000000-0000-4000-8000-000000000001'),
 ('b4000000-0000-4000-8000-000000000004','b2000000-0000-4000-8000-000000000001'),
 ('b4000000-0000-4000-8000-000000000005','b2000000-0000-4000-8000-000000000002'),
 ('b4000000-0000-4000-8000-000000000006','b2000000-0000-4000-8000-000000000001'),
 ('b4000000-0000-4000-8000-000000000007','b2000000-0000-4000-8000-000000000001');
insert into public.units(id,condominium_id,code,unit_type) values
 ('b8000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','101','apartment'),
 ('b8000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000001','102','apartment'),
 ('b8000000-0000-4000-8000-000000000003','b2000000-0000-4000-8000-000000000002','201','apartment');
insert into public.person_documents(person_id,document_type,document_hash,normalized_number,is_primary,country_code)
values ('b4000000-0000-4000-8000-000000000005','cpf','p3-private-b-doc-hash','00000000000',true,'BR');
insert into public.person_emails(person_id,email,is_primary) values ('b4000000-0000-4000-8000-000000000005','private-b@example.test',true);
insert into public.person_phones(person_id,phone_e164,is_primary) values ('b4000000-0000-4000-8000-000000000005','+5511888880000',true);
insert into public.person_emails(person_id,email,is_primary) values
 ('b4000000-0000-4000-8000-000000000006','p3-existing-resident@example.test',true),
 ('b4000000-0000-4000-8000-000000000007','finance-only@example.test',true);
insert into public.unit_occupancies(condominium_id,unit_id,person_id,occupancy_type,is_primary,starts_at)
values ('b2000000-0000-4000-8000-000000000001','b8000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000006','tenant',false,'2026-10-01');
insert into public.unit_financial_responsibilities(condominium_id,unit_id,person_id,starts_at)
values ('b2000000-0000-4000-8000-000000000001','b8000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000007','2026-11-02');
select is((select count(*)::int from public.permissions where code in ('people.read','people.manage','residents.read','residents.manage','ownerships.read','ownerships.manage','financial_responsibilities.read','financial_responsibilities.manage')),8,'exact P3 permission set exists');
select is((select count(*)::int from public.role_permissions rp join public.roles r on r.id=rp.role_id join public.permissions p on p.id=rp.permission_id where r.code in ('condominium.syndic','condominium.manager') and p.code in ('people.read','people.manage','residents.read','residents.manage','ownerships.read','ownerships.manage','financial_responsibilities.read','financial_responsibilities.manage')),16,'syndic and manager receive all eight P3 permissions');
select is((select count(*)::int from public.role_permissions rp join public.roles r on r.id=rp.role_id join public.permissions p on p.id=rp.permission_id where r.code in ('condominium.resident','condominium.doorman') and p.code in ('people.read','people.manage','residents.read','residents.manage','ownerships.read','ownerships.manage','financial_responsibilities.read','financial_responsibilities.manage')),0,'resident and doorman receive no administrative P3 permissions');
select is((select count(*)::int from public.role_permissions rp join public.roles r on r.id=rp.role_id join public.permissions p on p.id=rp.permission_id where r.code in ('condominium.syndic','condominium.manager') and p.code='users.invite'),2,'only condominium administrators receive the resident-invite capability');
select ok(public.is_valid_cpf('314.159.265-90'),'valid CPF passes check digits');
select ok(not public.is_valid_cpf('111.111.111-11'),'repeated-digit CPF fails validation');

set local role authenticated;
select set_config('request.jwt.claim.sub','b3000000-0000-4000-8000-000000000001',true);
select ok(public.has_permission('people.manage','b2000000-0000-4000-8000-000000000001'),'syndic may manage tenant A people');
select ok(not public.has_permission('people.manage','b2000000-0000-4000-8000-000000000002'),'syndic has no people permission in tenant B');
select ok(public.resolve_or_create_person_for_condominium('b2000000-0000-4000-8000-000000000001','Fernando P3',null,null,'314.159.265-90','fernando.p3@example.test','+5511999990001') is not null,'resolution RPC creates a person in tenant A');
reset role;
-- Replace the generated person id with deterministic lookup for the rest of the tests.
select is((select count(*)::int from public.people p join public.person_condominium_links l on l.person_id=p.id where l.condominium_id='b2000000-0000-4000-8000-000000000001' and p.full_name='Fernando P3'),1,'resolved person has a tenant A link');
select is((select count(*)::int from public.person_documents where document_type='cpf' and document_hash=encode(extensions.digest('31415926590','sha256'),'hex')),1,'CPF identity is normalized and unique by digest');
select set_config('request.jwt.claim.sub','',true);
select throws_ok($$select public.resolve_or_create_person_for_condominium('b2000000-0000-4000-8000-000000000001','Sem permissão',null,null,null,null,null)$$,'42501',null,'unauthenticated context cannot resolve a person');
set local role authenticated;
select set_config('request.jwt.claim.sub','b3000000-0000-4000-8000-000000000002',true);
select ok(public.resolve_or_create_person_for_condominium('b2000000-0000-4000-8000-000000000002','Fernando P3',null,null,'31415926590',null,null) is not null,'known global identity can be linked to tenant B without duplicate');
reset role;
select is((select count(*)::int from public.people where full_name='Fernando P3'),1,'identity is not duplicated across tenants');
select is((select count(*)::int from public.person_condominium_links where person_id=(select id from public.people where full_name='Fernando P3')),2,'global identity has explicit independent links');

insert into public.person_condominium_links(person_id,condominium_id) values ('b4000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000002');
insert into public.person_condominium_links(person_id,condominium_id) values ('b4000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000001');
insert into public.unit_ownerships(condominium_id,unit_id,person_id,ownership_percentage,starts_at) values
 ('b2000000-0000-4000-8000-000000000001','b8000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001',60,'2026-01-01'),
 ('b2000000-0000-4000-8000-000000000001','b8000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000002',40,'2026-01-01');
select throws_ok($$insert into public.unit_ownerships(condominium_id,unit_id,person_id,ownership_percentage,starts_at) values ('b2000000-0000-4000-8000-000000000001','b8000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000003',10,'2026-02-01')$$,'23514',null,'known overlapping ownership above 100 percent is rejected');
select throws_ok($$insert into public.unit_ownerships(condominium_id,unit_id,person_id,ownership_percentage,starts_at,ends_at) values ('b2000000-0000-4000-8000-000000000001','b8000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001',20,'2026-02-01','2026-03-01')$$,'23P01',null,'same person ownership overlap is rejected');
select lives_ok($$insert into public.unit_ownerships(condominium_id,unit_id,person_id,ownership_percentage,starts_at,ends_at) values ('b2000000-0000-4000-8000-000000000002','b8000000-0000-4000-8000-000000000003','b4000000-0000-4000-8000-000000000001',100,'2026-02-01','2026-03-01')$$,'same person may own another unit in another condominium');
select throws_ok($$insert into public.unit_ownerships(condominium_id,unit_id,person_id,starts_at) values ('b2000000-0000-4000-8000-000000000001','b8000000-0000-4000-8000-000000000003','b4000000-0000-4000-8000-000000000003','2026-02-01')$$,'23503',null,'cross-tenant unit relationship is rejected');
select throws_ok($$insert into public.unit_occupancies(condominium_id,unit_id,person_id,occupancy_type,is_primary,starts_at) values ('b2000000-0000-4000-8000-000000000001','b8000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000004','owner',false,'2026-01-01')$$,'23514',null,'owner occupancy without matching ownership is rejected');
insert into public.unit_ownerships(condominium_id,unit_id,person_id,ownership_percentage,starts_at) values ('b2000000-0000-4000-8000-000000000001','b8000000-0000-4000-8000-000000000002','b4000000-0000-4000-8000-000000000003',100,'2026-01-01');
insert into public.unit_occupancies(condominium_id,unit_id,person_id,occupancy_type,is_primary,starts_at,ends_at) values ('b2000000-0000-4000-8000-000000000001','b8000000-0000-4000-8000-000000000002','b4000000-0000-4000-8000-000000000003','owner',true,'2026-01-01','2026-11-01');
select throws_ok($$update public.unit_ownerships set ends_at='2026-10-15' where unit_id='b8000000-0000-4000-8000-000000000002' and person_id='b4000000-0000-4000-8000-000000000003'$$,'23514',null,'ownership cannot end before its owner occupancy');
select lives_ok($$insert into public.unit_occupancies(condominium_id,unit_id,person_id,occupancy_type,is_primary,starts_at) values ('b2000000-0000-4000-8000-000000000001','b8000000-0000-4000-8000-000000000002','b4000000-0000-4000-8000-000000000001','tenant',true,'2026-11-01')$$,'successor primary resident may start when prior period ends');
select throws_ok($$insert into public.unit_occupancies(condominium_id,unit_id,person_id,occupancy_type,is_primary,starts_at) values ('b2000000-0000-4000-8000-000000000001','b8000000-0000-4000-8000-000000000002','b4000000-0000-4000-8000-000000000002','tenant',true,'2026-10-01')$$,'23P01',null,'overlapping primary resident is rejected');
insert into public.unit_financial_responsibilities(condominium_id,unit_id,person_id,starts_at,ends_at) values ('b2000000-0000-4000-8000-000000000001','b8000000-0000-4000-8000-000000000002','b4000000-0000-4000-8000-000000000003','2026-01-01','2026-11-01');
select lives_ok($$insert into public.unit_financial_responsibilities(condominium_id,unit_id,person_id,starts_at) values ('b2000000-0000-4000-8000-000000000001','b8000000-0000-4000-8000-000000000002','b4000000-0000-4000-8000-000000000001','2026-11-01')$$,'financial responsibility may succeed without ownership or occupancy');
select throws_ok($$insert into public.unit_financial_responsibilities(condominium_id,unit_id,person_id,starts_at) values ('b2000000-0000-4000-8000-000000000001','b8000000-0000-4000-8000-000000000002','b4000000-0000-4000-8000-000000000002','2026-10-01')$$,'23P01',null,'overlapping financial responsibility is rejected');
select ok(exists(select 1 from public.audit_events where entity_type='unit_ownership' and entity_id=(select id from public.unit_ownerships where unit_id='b8000000-0000-4000-8000-000000000001' limit 1) and actor_user_account_id is not null),'relationship audit preserves the authenticated actor');

set local role authenticated;
select set_config('request.jwt.claim.sub','b3000000-0000-4000-8000-000000000001',true);
select ok(public.change_primary_resident('b8000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000003','2026-12-01','tenant','2027-01-01') is not null,'primary resident succession executes transactionally');
select is((select ends_at from public.unit_occupancies where unit_id='b8000000-0000-4000-8000-000000000002' and person_id='b4000000-0000-4000-8000-000000000001' and is_primary),'2026-12-01'::date,'primary successor closes the previous interval on its start date');
select is((select ends_at from public.unit_occupancies where unit_id='b8000000-0000-4000-8000-000000000002' and person_id='b4000000-0000-4000-8000-000000000003' and starts_at='2026-12-01'), '2027-01-01'::date,'primary RPC preserves the requested exclusive end date');
select throws_ok($$select public.resolve_or_create_person_for_condominium('b2000000-0000-4000-8000-000000000001','Nome conflitante',null,null,'31415926590',null,null)$$,'23514','Não foi possível validar os dados informados.','CPF conflict returns a neutral message');
select ok(public.resolve_or_create_person_for_condominium('b2000000-0000-4000-8000-000000000001','Fernando P3',null,null,'31415926590',null,null) is not null,'retrying CPF resolution reuses the same person');
select throws_ok($$select public.resolve_or_create_person_for_condominium('b2000000-0000-4000-8000-000000000001','CPF inválido',null,null,'11111111111',null,null)$$,'22023','Documento inválido.','invalid CPF cannot be registered');
select throws_ok($$select public.resolve_or_create_person_for_condominium('b2000000-0000-4000-8000-000000000001','Contato existente',null,null,null,'fernando.p3@example.test',null)$$,'23505',null,'same-tenant email is considered for duplicate prevention');
select ok(public.resolve_or_create_person_for_condominium('b2000000-0000-4000-8000-000000000001','Pessoa sem CPF',null,null,null,'sem-cpf@example.test',null) is not null,'a person may be registered without CPF');
select throws_ok($$select public.set_person_cpf((select id from public.people where full_name='Fernando P3'),'b2000000-0000-4000-8000-000000000001','271.828.182-05',false)$$,'22023','Confirme a alteração do documento.','CPF changes require explicit confirmation');
select ok(public.set_person_cpf((select id from public.people where full_name='Fernando P3'),'b2000000-0000-4000-8000-000000000001','271.828.182-05',true),'confirmed CPF change succeeds');
select is((select count(*)::int from public.person_documents where person_id=(select id from public.people where full_name='Fernando P3') and document_type='cpf'),2,'CPF changes preserve the former document record');
select throws_ok($$select public.set_person_cpf('b4000000-0000-4000-8000-000000000003','b2000000-0000-4000-8000-000000000001','27182818205',true)$$,'23505','Não foi possível validar os dados informados.','a CPF already owned by another person is blocked neutrally');
select throws_ok($$update public.people set status='inactive' where id='b4000000-0000-4000-8000-000000000003'$$,'23514','Pessoa com vínculo vigente não pode ser inativada.','person with current relationships cannot be deactivated');
select throws_ok($$update public.person_condominium_links set status='inactive' where person_id='b4000000-0000-4000-8000-000000000003' and condominium_id='b2000000-0000-4000-8000-000000000001'$$,'23514','Vínculo pessoa-condomínio possui relacionamento vigente.','active relationships prevent hiding the person from its tenant');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','b3000000-0000-4000-8000-000000000001',true);
select throws_ok($$insert into public.person_condominium_links(person_id,condominium_id) values ('b4000000-0000-4000-8000-000000000005','b2000000-0000-4000-8000-000000000001')$$,'42501',null,'app users cannot attach a global person by UUID');
select throws_ok($$update public.person_condominium_links set person_id='b4000000-0000-4000-8000-000000000005' where person_id='b4000000-0000-4000-8000-000000000001' and condominium_id='b2000000-0000-4000-8000-000000000001'$$,'42501',null,'app users cannot change identity or tenant on a person link');
select is((select count(*)::int from public.people where id='b4000000-0000-4000-8000-000000000005'),0,'administrator A cannot discover person B without a tenant A link');
select is((select count(*)::int from public.person_condominium_links where person_id='b4000000-0000-4000-8000-000000000002' and condominium_id='b2000000-0000-4000-8000-000000000002'),0,'administrator A cannot inspect another tenant link');
select is((select count(*)::int from public.unit_ownerships where condominium_id='b2000000-0000-4000-8000-000000000002'),0,'administrator A cannot read ownership in tenant B');
select is((select count(*)::int from public.unit_ownerships where condominium_id='b2000000-0000-4000-8000-000000000001'),3,'administrator A can read only linked ownerships in tenant A');
select is((select count(*)::int from public.person_documents where normalized_number='00000000000'),0,'administrator A cannot enumerate another tenant by CPF');
select is((select count(*)::int from public.person_emails where email='private-b@example.test'),0,'administrator A cannot enumerate another tenant by email');
select is((select count(*)::int from public.person_phones where phone_e164='+5511888880000'),0,'administrator A cannot enumerate another tenant by phone');
select set_config('request.jwt.claim.sub','b3000000-0000-4000-8000-000000000003',true);
select is((select count(*)::int from public.people where id='b4000000-0000-4000-8000-000000000001'),0,'resident cannot read another person');
select is((select count(*)::int from public.person_documents where person_id='b4000000-0000-4000-8000-000000000005'),0,'resident cannot read another person document');
select is((select count(*)::int from public.person_emails where person_id='b4000000-0000-4000-8000-000000000005'),0,'resident cannot read another person email');
select is((select count(*)::int from public.person_phones where person_id='b4000000-0000-4000-8000-000000000005'),0,'resident cannot read another person phone');
select is((select count(*)::int from public.unit_occupancies where person_id='b4000000-0000-4000-8000-000000000001'),0,'resident cannot read another occupant private relationship');
select is((select count(*)::int from public.unit_occupancies where person_id='b4000000-0000-4000-8000-000000000003'),2,'resident can read own current and scheduled occupancy history');
select is((select count(*)::int from public.units where id='b8000000-0000-4000-8000-000000000002'),1,'resident can read own eligible unit');
select is((select count(*)::int from public.units where id='b8000000-0000-4000-8000-000000000001'),0,'resident cannot read an unrelated unit');
select set_config('request.jwt.claim.sub','b3000000-0000-4000-8000-000000000004',true);
select is((select count(*)::int from public.person_condominium_links where person_id<>public.current_person_id()),0,'doorman cannot browse person directory');
select is((select count(*)::int from public.unit_ownerships),0,'doorman cannot browse ownership directory');
reset role;

create temporary table p3_saved_contacts(kind text primary key,id uuid);
create temporary table p3_test_invitation(id uuid,token text);
grant all on p3_saved_contacts,p3_test_invitation to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','b3000000-0000-4000-8000-000000000001',true);
select ok(public.has_permission('users.invite','b2000000-0000-4000-8000-000000000001'),'syndic may issue resident invitations in the authorized condominium');
insert into p3_saved_contacts select 'email', public.save_person_contact((select id from public.people where full_name='Fernando P3'),'b2000000-0000-4000-8000-000000000001','email',(select id from public.person_emails where person_id=(select id from public.people where full_name='Fernando P3') limit 1),'fernando.updated@example.test','email',true,false);
select is((select email from public.person_emails where id=(select id from p3_saved_contacts where kind='email')),'fernando.updated@example.test','authorized contact editor updates email through the tenant RPC');
select is((select count(*)::int from public.person_emails where person_id=(select id from public.people where full_name='Fernando P3') and is_primary),1,'email primary flag remains unique after an edit');
reset role;
select ok(exists(select 1 from public.audit_events where entity_type='person_email' and entity_id=(select id from p3_saved_contacts where kind='email')),'email edits produce an audit event');
set local role authenticated;
insert into p3_saved_contacts select 'phone', public.save_person_contact((select id from public.people where full_name='Fernando P3'),'b2000000-0000-4000-8000-000000000001','phone',null,'+5511999990001','mobile',true,true);
select is((select phone_e164 from public.person_phones where id=(select id from p3_saved_contacts where kind='phone')),'+5511999990001','authorized contact editor saves an E.164 phone');
select ok((select is_primary and is_whatsapp and not is_verified from public.person_phones where id=(select id from p3_saved_contacts where kind='phone')),'phone edit stores primary and WhatsApp flags and clears stale verification');
select ok(exists(select 1 from public.audit_events where entity_type='person_email' and entity_id=(select id from p3_saved_contacts where kind='email')),'authenticated administrator reads the permitted contact audit event');
select is((select count(*)::int from public.audit_events where metadata->>'condominium_id'='b2000000-0000-4000-8000-000000000002'),0,'audit RLS denies tenant B events to administrator A');
select ok(not has_column_privilege('authenticated','public.audit_events','actor_auth_user_id','SELECT'),'audit read grant does not expose actor identifiers');
select ok(not has_table_privilege('authenticated','public.audit_events','INSERT'),'audit read grant does not allow application writes');
select set_config('request.jwt.claim.sub','b3000000-0000-4000-8000-000000000003',true);
select is((select count(*)::int from public.audit_events),0,'resident cannot read administrative audit events');
select set_config('request.jwt.claim.sub','b3000000-0000-4000-8000-000000000004',true);
select is((select count(*)::int from public.audit_events),0,'doorman cannot browse P3 audit events');

select set_config('request.jwt.claim.sub','b3000000-0000-4000-8000-000000000003',true);
select throws_ok($$select public.save_person_contact('b4000000-0000-4000-8000-000000000003','b2000000-0000-4000-8000-000000000001','email',null,'resident-edit@example.test','email',false,false)$$,'42501',null,'resident cannot edit contacts through the administrator RPC');
select set_config('request.jwt.claim.sub','b3000000-0000-4000-8000-000000000001',true);
insert into p3_test_invitation select public.issue_resident_invitation('b4000000-0000-4000-8000-000000000006','b2000000-0000-4000-8000-000000000001','p3-existing-resident@example.test',encode(extensions.digest(repeat('a',64),'sha256'),'hex')),repeat('a',64);
reset role;
select is((select status from public.user_invitations where id=(select id from p3_test_invitation)),'pending','P1 invitation row starts pending and stores only the token digest');
set local role authenticated;
select set_config('request.jwt.claim.sub','b3000000-0000-4000-8000-000000000005',true);
select is(public.accept_resident_invitation((select token from p3_test_invitation)),'b2000000-0000-4000-8000-000000000001'::uuid,'confirmed account accepts an invite into the addressed condominium');
reset role;
select is((select status from public.user_invitations where id=(select id from p3_test_invitation)),'accepted','acceptance consumes the invitation');
set local role authenticated;
select set_config('request.jwt.claim.sub','b3000000-0000-4000-8000-000000000005',true);
select is((select id from public.user_accounts where auth_user_id='b3000000-0000-4000-8000-000000000005'),'b5000000-0000-4000-8000-000000000005'::uuid,'acceptance reuses the pre-existing user account');
select is((select count(*)::int from public.condominium_memberships where user_account_id='b5000000-0000-4000-8000-000000000005' and condominium_id='b2000000-0000-4000-8000-000000000001' and status='active'),1,'acceptance creates one active condominium membership');
select is((select count(*)::int from public.role_assignments ra join public.roles r on r.id=ra.role_id where ra.user_account_id='b5000000-0000-4000-8000-000000000005' and ra.condominium_id='b2000000-0000-4000-8000-000000000001' and r.code='condominium.resident' and ra.status='active'),1,'acceptance assigns the canonical condominium.resident role');
select ok(public.has_condominium_access('b2000000-0000-4000-8000-000000000001'),'accepted account has authorized access to the invited condominium');
select is((select count(*)::int from public.units where id='b8000000-0000-4000-8000-000000000001'),1,'accepted resident sees only the unit with their occupancy');
reset role;
select ok(not exists(select 1 from public.audit_events where entity_type='user_invitation' and entity_id=(select id from p3_test_invitation) and metadata::text like '%'||repeat('a',64)||'%'),'invitation audit excludes the raw one-time token');
set local role authenticated;
select set_config('request.jwt.claim.sub','b3000000-0000-4000-8000-000000000005',true);
select throws_ok($$select public.accept_resident_invitation((select token from p3_test_invitation))$$,'42501','Convite inválido ou expirado.','accepted invitation token cannot be replayed');
select set_config('request.jwt.claim.sub','b3000000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.issue_resident_invitation('b4000000-0000-4000-8000-000000000007','b2000000-0000-4000-8000-000000000001','finance-only@example.test',encode(extensions.digest('p3-finance-only-token','sha256'),'hex'))$$,'42501',null,'financial responsibility alone cannot qualify a person for a resident invitation');
reset role;
update public.condominium_memberships set status='ended',starts_at=now()-interval '1 day',ends_at=now() where id='b6000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','b3000000-0000-4000-8000-000000000001',true);
select ok(not public.has_condominium_access('b2000000-0000-4000-8000-000000000001'),'ended membership blocks condominium access');
select is((select count(*)::int from public.units where id='b8000000-0000-4000-8000-000000000001'),0,'ended membership blocks resident self-access to a unit');
reset role;

update public.user_accounts set status='suspended' where id='b5000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','b3000000-0000-4000-8000-000000000001',true);
select is(public.current_user_account_id(),null::uuid,'suspended account blocks self-access');
reset role;

select ok(
  not has_table_privilege('authenticated', format('public.%I', table_name), privilege_type),
  format('authenticated cannot %s %s', privilege_type, table_name)
) from unnest(array['person_condominium_links','unit_ownerships','unit_occupancies','unit_financial_responsibilities']) table_name
cross join unnest(array['DELETE','TRUNCATE','TRIGGER','MAINTAIN']) privilege_type;

select ok(
  not has_table_privilege('anon', format('public.%I', table_name), privilege_type),
  format('anon cannot %s %s', privilege_type, table_name)
) from unnest(array['person_condominium_links','unit_ownerships','unit_occupancies','unit_financial_responsibilities']) table_name
cross join unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) privilege_type;

select ok(
  not exists (
    select 1
    from pg_class c
    cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) a
    where c.oid = format('public.%I', table_name)::regclass
      and a.grantee = 0
      and a.privilege_type = privilege_type
  ),
  format('PUBLIC cannot %s %s', privilege_type, table_name)
) from unnest(array['person_condominium_links','unit_ownerships','unit_occupancies','unit_financial_responsibilities']) table_name
cross join unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) privilege_type;

select ok((select relrowsecurity from pg_class where oid='public.person_condominium_links'::regclass),'RLS remains enabled on person-condominium history');
select ok((select relrowsecurity from pg_class where oid='public.unit_ownerships'::regclass),'RLS remains enabled on ownership history');
select ok((select relrowsecurity from pg_class where oid='public.unit_occupancies'::regclass),'RLS remains enabled on occupancy history');
select ok((select relrowsecurity from pg_class where oid='public.unit_financial_responsibilities'::regclass),'RLS remains enabled on financial-responsibility history');
select ok(not exists (select 1 from pg_policies where schemaname='public' and tablename='person_condominium_links' and cmd in ('DELETE','ALL')),'person-condominium history has no DELETE or ALL policy');
select ok(not exists (select 1 from pg_policies where schemaname='public' and tablename='unit_ownerships' and cmd in ('DELETE','ALL')),'ownership history has no DELETE or ALL policy');
select ok(not exists (select 1 from pg_policies where schemaname='public' and tablename='unit_occupancies' and cmd in ('DELETE','ALL')),'occupancy history has no DELETE or ALL policy');
select ok(not exists (select 1 from pg_policies where schemaname='public' and tablename='unit_financial_responsibilities' and cmd in ('DELETE','ALL')),'financial-responsibility history has no DELETE or ALL policy');

select * from finish();
rollback;
