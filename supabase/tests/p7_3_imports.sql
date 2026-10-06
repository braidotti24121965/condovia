begin;
create extension if not exists pgtap with schema extensions;
select plan(35);
select has_table('public','import_batches','import batches table exists');
select has_table('public','import_batch_rows','import rows table exists');
select ok((select relrowsecurity from pg_class where oid='public.import_batches'::regclass),'batch RLS enabled');
select ok((select relrowsecurity from pg_class where oid='public.import_batch_rows'::regclass),'row RLS enabled');
select has_function('public','confirm_import_batch','confirmation RPC exists');
select ok((select prosecdef from pg_proc where proname='confirm_import_batch' limit 1),'confirmation RPC is security definer');
select ok(not has_function_privilege('anon','public.confirm_import_batch(uuid)','execute'),'anonymous confirmation denied');
select ok(exists(select 1 from public.permissions where code='imports.read'),'imports.read exists');
select ok(exists(select 1 from public.permissions where code='imports.manage'),'imports.manage exists');
select ok(exists(select 1 from public.role_permissions rp join public.roles r on r.id=rp.role_id join public.permissions p on p.id=rp.permission_id where r.code in ('condominium.syndic','condominium.manager') and p.code='imports.read'),'syndic/manager read permission mapped');
select ok(exists(select 1 from public.role_permissions rp join public.roles r on r.id=rp.role_id join public.permissions p on p.id=rp.permission_id where r.code in ('condominium.syndic','condominium.manager') and p.code='imports.manage'),'syndic/manager manage permission mapped');
select ok(not exists(select 1 from public.role_permissions rp join public.roles r on r.id=rp.role_id join public.permissions p on p.id=rp.permission_id where r.code in ('condominium.resident','condominium.doorman') and p.code like 'imports.%'),'resident/doorman have no import permission');
select ok(exists(select 1 from pg_policies where tablename='import_batches' and policyname='import_batches_read'),'batch read RLS policy exists');
select ok(exists(select 1 from pg_policies where tablename='import_batches' and policyname='import_batches_manage'),'batch manage RLS policy exists');
select ok(exists(select 1 from pg_policies where tablename='import_batch_rows' and policyname='import_batch_rows_read'),'row read RLS policy exists');
select ok(exists(select 1 from pg_policies where tablename='import_batch_rows' and policyname='import_batch_rows_manage'),'row manage RLS policy exists');
select ok(position('classification=''new''' in (select prosrc from pg_proc where proname='confirm_import_batch' limit 1)) > 0,'confirmation processes only new rows');
select ok(position('invalid_rows' in (select prosrc from pg_proc where proname='confirm_import_batch' limit 1)) = 0,'invalid rows do not block confirmation');

-- Behavioral fixtures are isolated by the transaction enclosing this test file.
insert into public.clients (id, legal_name) values ('91000000-0000-4000-8000-000000000001','P7.3 Cliente');
insert into public.condominiums (id, client_id, name) values
 ('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','P7.3 Condomínio A'),
 ('92000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000001','P7.3 Condomínio B');
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at) values
 ('93000000-0000-4000-8000-000000000001','authenticated','authenticated','p73-syndic@test.local','',now(),now(),now()),
 ('93000000-0000-4000-8000-000000000002','authenticated','authenticated','p73-resident@test.local','',now(),now(),now());
insert into public.people (id, full_name, status) values
 ('94000000-0000-4000-8000-000000000001','P7.3 Síndico','active'),
 ('94000000-0000-4000-8000-000000000002','P7.3 Morador','active'),
 ('94000000-0000-4000-8000-000000000003','Pessoa Existente','active');
insert into public.user_accounts (id, auth_user_id, person_id) values
 ('95000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000001'),
 ('95000000-0000-4000-8000-000000000002','93000000-0000-4000-8000-000000000002','94000000-0000-4000-8000-000000000002');
insert into public.condominium_memberships (id, condominium_id, user_account_id) values
 ('96000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000001'),
 ('96000000-0000-4000-8000-000000000002','92000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000002');
insert into public.person_condominium_links (person_id, condominium_id, status) values
 ('94000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','active'),
 ('94000000-0000-4000-8000-000000000002','92000000-0000-4000-8000-000000000001','active'),
 ('94000000-0000-4000-8000-000000000003','92000000-0000-4000-8000-000000000001','active');
insert into public.role_assignments (id,user_account_id,role_id,condominium_id) values
 ('97000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000001',(select id from public.roles where code='condominium.syndic'),'92000000-0000-4000-8000-000000000001'),
 ('97000000-0000-4000-8000-000000000002','95000000-0000-4000-8000-000000000002',(select id from public.roles where code='condominium.resident_owner'),'92000000-0000-4000-8000-000000000001');
insert into public.condominium_structures (id,condominium_id,structure_type,name,status) values
 ('98000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','tower','Estrutura Existente','active');
insert into public.units (id,condominium_id,structure_id,code,unit_type,operational_status) values
 ('99000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','98000000-0000-4000-8000-000000000001','A-101','apartment','active');
insert into public.unit_ownerships (id,condominium_id,unit_id,person_id,starts_at) values
 ('9a000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','99000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000003',current_date);
insert into public.unit_occupancies (id,condominium_id,unit_id,person_id,occupancy_type,starts_at) values
 ('9b000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','99000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000003','tenant',current_date);

-- A single structures batch contains a new row and a pre-classified duplicate/invalid.
insert into public.import_batches (id,condominium_id,created_by_user_account_id,entity_type,file_name,file_hash,total_rows,new_rows,duplicate_rows,invalid_rows)
values ('9c000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000001','structures','p73-structures.csv','p73-structures-1',3,1,1,1);
insert into public.import_batch_rows (batch_id,condominium_id,row_number,classification,normalized_data,message) values
 ('9c000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001',2,'new',jsonb_build_object('structure_type','tower','name','Estrutura Nova'),''),
 ('9c000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001',3,'duplicate',jsonb_build_object('structure_type','tower','name','Estrutura Existente'),'existing'),
 ('9c000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001',4,'invalid',jsonb_build_object('structure_type','invalid','name',''),'invalid');
set local role authenticated;
select set_config('request.jwt.claim.sub','93000000-0000-4000-8000-000000000001',true);
select lives_ok($$select public.confirm_import_batch('9c000000-0000-4000-8000-000000000001')$$,'syndic confirms batch with invalid and duplicate rows');
select is((select count(*)::int from public.condominium_structures where condominium_id='92000000-0000-4000-8000-000000000001' and name='Estrutura Nova'),1,'only new structure was inserted');
select is((select count(*)::int from public.condominium_structures where condominium_id='92000000-0000-4000-8000-000000000001' and name='Estrutura Existente'),1,'duplicate structure was not overwritten');
select is((select count(*)::int from public.condominium_structures where condominium_id='92000000-0000-4000-8000-000000000001' and name=''),0,'invalid structure was not inserted');
select throws_ok($$select public.confirm_import_batch('9c000000-0000-4000-8000-000000000001')$$,'23514','Lote já confirmado.','reconfirmation is rejected');

-- Existing natural keys for units, people, owners and residents are represented as duplicate rows.
insert into public.import_batches (id,condominium_id,created_by_user_account_id,entity_type,file_name,file_hash,total_rows,new_rows,duplicate_rows,invalid_rows)
values
 ('9c000000-0000-4000-8000-000000000002','92000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000001','units','p73-units.csv','p73-units-1',1,0,1,0),
 ('9c000000-0000-4000-8000-000000000003','92000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000001','people','p73-people.csv','p73-people-1',1,0,1,0),
 ('9c000000-0000-4000-8000-000000000004','92000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000001','owners','p73-owners.csv','p73-owners-1',1,0,1,0),
 ('9c000000-0000-4000-8000-000000000005','92000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000001','residents','p73-residents.csv','p73-residents-1',1,0,1,0);
insert into public.import_batch_rows (batch_id,condominium_id,row_number,classification,normalized_data,message) values
 ('9c000000-0000-4000-8000-000000000002','92000000-0000-4000-8000-000000000001',2,'duplicate',jsonb_build_object('code','A-101','structure_id','98000000-0000-4000-8000-000000000001'),'existing'),
 ('9c000000-0000-4000-8000-000000000003','92000000-0000-4000-8000-000000000001',2,'duplicate',jsonb_build_object('full_name','Pessoa Existente'),'existing'),
 ('9c000000-0000-4000-8000-000000000004','92000000-0000-4000-8000-000000000001',2,'duplicate',jsonb_build_object('unit_id','99000000-0000-4000-8000-000000000001','person_id','94000000-0000-4000-8000-000000000003','starts_at',current_date::text),'existing'),
 ('9c000000-0000-4000-8000-000000000005','92000000-0000-4000-8000-000000000001',2,'duplicate',jsonb_build_object('unit_id','99000000-0000-4000-8000-000000000001','person_id','94000000-0000-4000-8000-000000000003','starts_at',current_date::text),'existing');
select lives_ok($$select public.confirm_import_batch('9c000000-0000-4000-8000-000000000002')$$,'unit duplicate batch is safely confirmable');
select lives_ok($$select public.confirm_import_batch('9c000000-0000-4000-8000-000000000003')$$,'person duplicate batch is safely confirmable');
select lives_ok($$select public.confirm_import_batch('9c000000-0000-4000-8000-000000000004')$$,'owner duplicate batch is safely confirmable');
select lives_ok($$select public.confirm_import_batch('9c000000-0000-4000-8000-000000000005')$$,'resident duplicate batch is safely confirmable');
select is((select count(*)::int from public.units where code='A-101' and condominium_id='92000000-0000-4000-8000-000000000001'),1,'unit duplicate was not added');
select is((select count(*)::int from public.people where full_name='Pessoa Existente'),1,'person duplicate was not added');
select is((select count(*)::int from public.unit_ownerships where id='9a000000-0000-4000-8000-000000000001'),1,'owner duplicate was not added');
select is((select count(*)::int from public.unit_occupancies where id='9b000000-0000-4000-8000-000000000001'),1,'resident duplicate was not added');

-- A controlled constraint failure after the first insert must roll back both new rows.
insert into public.import_batches (id,condominium_id,created_by_user_account_id,entity_type,file_name,file_hash,total_rows,new_rows)
values ('9c000000-0000-4000-8000-000000000006','92000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000001','structures','p73-rollback.csv','p73-rollback-1',2,2);
insert into public.import_batch_rows (batch_id,condominium_id,row_number,classification,normalized_data) values
 ('9c000000-0000-4000-8000-000000000006','92000000-0000-4000-8000-000000000001',2,'new',jsonb_build_object('structure_type','tower','name','Rollback Nova A')),
 ('9c000000-0000-4000-8000-000000000006','92000000-0000-4000-8000-000000000001',3,'new',jsonb_build_object('structure_type','invalid','name','Rollback Nova B'));
select throws_ok($$select public.confirm_import_batch('9c000000-0000-4000-8000-000000000006')$$,'23514',null,'constraint failure rolls back the batch');
select is((select count(*)::int from public.condominium_structures where name like 'Rollback Nova%'),0,'rollback removed all new structures');

-- An authenticated resident cannot read or confirm a batch from another condominium.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','93000000-0000-4000-8000-000000000002',true);
select is((select count(*)::int from public.import_batches where condominium_id='92000000-0000-4000-8000-000000000002'),0,'other condominium batches are not readable');
select throws_ok($$select public.confirm_import_batch('9c000000-0000-4000-8000-000000000001')$$,'42501',null,'resident cannot confirm import batch');
select * from finish();
rollback;
