create extension if not exists pgtap with schema extensions;
select plan(66);

begin;
insert into public.clients(id,legal_name) values ('d2c10000-0000-4200-8200-000000000001','P2 test client');
insert into public.condominiums(id,client_id,name) values
 ('d2c20000-0000-4200-8200-000000000001','d2c10000-0000-4200-8200-000000000001','Tenant A'),
 ('d2c20000-0000-4200-8200-000000000002','d2c10000-0000-4200-8200-000000000001','Tenant B');
insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at) values
 ('d2c30000-0000-4200-8200-000000000001','authenticated','authenticated','p2-a@example.test','',now(),now(),now()),
 ('d2c30000-0000-4200-8200-000000000002','authenticated','authenticated','p2-b@example.test','',now(),now(),now()),
 ('d2c30000-0000-4200-8200-000000000003','authenticated','authenticated','p2-doorman@example.test','',now(),now(),now()),
 ('d2c30000-0000-4200-8200-000000000004','authenticated','authenticated','p2-resident@example.test','',now(),now(),now()),
 ('d2c30000-0000-4200-8200-000000000005','authenticated','authenticated','p2-reader@example.test','',now(),now(),now());
insert into public.people(id,full_name) values
 ('d2c40000-0000-4200-8200-000000000001','P2 Síndico A'),('d2c40000-0000-4200-8200-000000000002','P2 Síndico B'),
 ('d2c40000-0000-4200-8200-000000000003','P2 Porteiro'),('d2c40000-0000-4200-8200-000000000004','P2 Morador'),
 ('d2c40000-0000-4200-8200-000000000005','P2 Leitor');
insert into public.user_accounts(id,auth_user_id,person_id) values
 ('d2c50000-0000-4200-8200-000000000001','d2c30000-0000-4200-8200-000000000001','d2c40000-0000-4200-8200-000000000001'),
 ('d2c50000-0000-4200-8200-000000000002','d2c30000-0000-4200-8200-000000000002','d2c40000-0000-4200-8200-000000000002'),
 ('d2c50000-0000-4200-8200-000000000003','d2c30000-0000-4200-8200-000000000003','d2c40000-0000-4200-8200-000000000003'),
 ('d2c50000-0000-4200-8200-000000000004','d2c30000-0000-4200-8200-000000000004','d2c40000-0000-4200-8200-000000000004'),
 ('d2c50000-0000-4200-8200-000000000005','d2c30000-0000-4200-8200-000000000005','d2c40000-0000-4200-8200-000000000005');
insert into public.condominium_memberships(id,condominium_id,user_account_id) values
 ('d2c60000-0000-4200-8200-000000000001','d2c20000-0000-4200-8200-000000000001','d2c50000-0000-4200-8200-000000000001'),
 ('d2c60000-0000-4200-8200-000000000002','d2c20000-0000-4200-8200-000000000002','d2c50000-0000-4200-8200-000000000002'),
 ('d2c60000-0000-4200-8200-000000000003','d2c20000-0000-4200-8200-000000000001','d2c50000-0000-4200-8200-000000000003'),
 ('d2c60000-0000-4200-8200-000000000004','d2c20000-0000-4200-8200-000000000001','d2c50000-0000-4200-8200-000000000004'),
 ('d2c60000-0000-4200-8200-000000000005','d2c20000-0000-4200-8200-000000000001','d2c50000-0000-4200-8200-000000000005');
insert into public.role_assignments(user_account_id,role_id,condominium_id) values
 ('d2c50000-0000-4200-8200-000000000001',(select id from public.roles where code='condominium.syndic'),'d2c20000-0000-4200-8200-000000000001'),
 ('d2c50000-0000-4200-8200-000000000002',(select id from public.roles where code='condominium.syndic'),'d2c20000-0000-4200-8200-000000000002'),
 ('d2c50000-0000-4200-8200-000000000003',(select id from public.roles where code='condominium.doorman'),'d2c20000-0000-4200-8200-000000000001'),
 ('d2c50000-0000-4200-8200-000000000004',(select id from public.roles where code='condominium.resident_owner'),'d2c20000-0000-4200-8200-000000000001');
insert into public.roles(code,name,scope,scope_type) values ('p2.test_reader','Leitor de teste','condominium','condominium');
insert into public.role_permissions(role_id,permission_id)
select (select id from public.roles where code='p2.test_reader'),id from public.permissions where code in ('structures.read','units.read','context.read');
insert into public.role_assignments(user_account_id,role_id,condominium_id) values
 ('d2c50000-0000-4200-8200-000000000005',(select id from public.roles where code='p2.test_reader'),'d2c20000-0000-4200-8200-000000000001');
insert into public.condominium_structures(id,condominium_id,structure_type,name) values
 ('d2c70000-0000-4200-8200-000000000001','d2c20000-0000-4200-8200-000000000001','tower','Torre A'),
 ('d2c70000-0000-4200-8200-000000000002','d2c20000-0000-4200-8200-000000000001','tower','Torre B'),
 ('d2c70000-0000-4200-8200-000000000003','d2c20000-0000-4200-8200-000000000002','tower','Torre B');
insert into public.condominium_structures(id,condominium_id,parent_id,structure_type,name) values
 ('d2c70000-0000-4200-8200-000000000004','d2c20000-0000-4200-8200-000000000001','d2c70000-0000-4200-8200-000000000001','sector','Setor 1');
select ok(exists(select 1 from public.audit_events where entity_type='condominium_structure' and entity_id='d2c70000-0000-4200-8200-000000000001' and metadata->>'condominium_id'='d2c20000-0000-4200-8200-000000000001'),'structure audit records the tenant context');
insert into public.units(id,condominium_id,structure_id,code,unit_type) values
 ('d2c80000-0000-4200-8200-000000000001','d2c20000-0000-4200-8200-000000000001','d2c70000-0000-4200-8200-000000000001','101','apartment'),
 ('d2c80000-0000-4200-8200-000000000002','d2c20000-0000-4200-8200-000000000002','d2c70000-0000-4200-8200-000000000003','202','apartment');
select throws_ok($$insert into public.condominium_structures(condominium_id,structure_type,name,code) values ('d2c20000-0000-4200-8200-000000000001','block','Código em branco','   ')$$,'23514',null,'whitespace-only optional structure code is rejected');
select throws_ok($$update public.condominium_structures set status='inactive' where id='d2c70000-0000-4200-8200-000000000001'$$,'23514',null,'structure with active descendants or units cannot be deactivated');
insert into public.addresses(id,street,city,state) values
 ('d2c90000-0000-4200-8200-000000000001','Rua A','São Paulo','SP'),
 ('d2c90000-0000-4200-8200-000000000002','Rua B','Campinas','SP');
update public.condominiums set address_id='d2c90000-0000-4200-8200-000000000001' where id='d2c20000-0000-4200-8200-000000000001';
update public.condominiums set address_id='d2c90000-0000-4200-8200-000000000002' where id='d2c20000-0000-4200-8200-000000000002';
select throws_ok($$update public.condominiums set address_id='d2c90000-0000-4200-8200-000000000001' where id='d2c20000-0000-4200-8200-000000000002'$$,'23505',null,'an address row cannot be shared across condominium tenants');

select throws_ok($$insert into public.condominium_structures(condominium_id,parent_id,structure_type,name) values ('d2c20000-0000-4200-8200-000000000001','d2c70000-0000-4200-8200-000000000003','block','X')$$,'23514',null,'structure parent must belong to same tenant');
select throws_ok($$insert into public.condominium_structures(id,condominium_id,parent_id,structure_type,name) values ('d2c70000-0000-4200-8200-000000000005','d2c20000-0000-4200-8200-000000000001','d2c70000-0000-4200-8200-000000000005','block','Self')$$,'23514',null,'self-parent is rejected');
select throws_ok($$update public.condominium_structures set parent_id='d2c70000-0000-4200-8200-000000000004' where id='d2c70000-0000-4200-8200-000000000001'$$,'23514',null,'reparenting beneath descendant cannot create indirect cycle');
select throws_ok($$insert into public.condominium_structures(condominium_id,structure_type,name) values ('d2c20000-0000-4200-8200-000000000001','tower',' torre a ')$$,'23505',null,'structure name uniqueness is trimmed and case-insensitive');
select throws_ok($$insert into public.units(condominium_id,structure_id,code,unit_type) values ('d2c20000-0000-4200-8200-000000000002','d2c70000-0000-4200-8200-000000000001','x','apartment')$$,'23514',null,'unit structure must belong to same tenant');
select throws_ok($$insert into public.units(condominium_id,structure_id,code,unit_type) values ('d2c20000-0000-4200-8200-000000000001','d2c70000-0000-4200-8200-000000000001',' 101 ','apartment')$$,'23505',null,'unit code uniqueness is trimmed and case-insensitive');
select lives_ok($$insert into public.units(condominium_id,structure_id,code,unit_type) values ('d2c20000-0000-4200-8200-000000000001','d2c70000-0000-4200-8200-000000000002','101','apartment')$$,'same code is allowed in another structure');
select lives_ok($$insert into public.units(condominium_id,code,unit_type) values ('d2c20000-0000-4200-8200-000000000001',' 101 ','apartment')$$,'root and structured code may match');
select throws_ok($$insert into public.units(condominium_id,code,unit_type) values ('d2c20000-0000-4200-8200-000000000001','101','apartment')$$,'23505',null,'duplicate normalized root code is rejected');
select throws_ok($$insert into public.units(condominium_id,code,unit_type,area) values ('d2c20000-0000-4200-8200-000000000001','bad-area','apartment',0)$$,'23514',null,'unit area must be greater than zero');
select throws_ok($$insert into public.units(condominium_id,code,unit_type,ownership_fraction) values ('d2c20000-0000-4200-8200-000000000001','bad-fraction','apartment',100.01)$$,'23514',null,'fraction is limited to zero through one hundred');
select lives_ok($$insert into public.units(condominium_id,code,unit_type,ownership_fraction) values ('d2c20000-0000-4200-8200-000000000001','zero-fraction','apartment',0)$$,'zero ownership fraction differs from null and is valid');
select throws_ok($$update public.condominiums set document_number='11111111111111' where id='d2c20000-0000-4200-8200-000000000001'$$,'23514',null,'invalid CNPJ check digits are rejected');
update public.condominiums set document_number='11222333000181' where id='d2c20000-0000-4200-8200-000000000001';
select throws_ok($$update public.condominiums set document_number='11.222.333/0001-81' where id='d2c20000-0000-4200-8200-000000000002'$$,'23505',null,'normalized active CNPJ is unique');
select lives_ok($$insert into public.condominium_structures(condominium_id,structure_type,name) values ('d2c20000-0000-4200-8200-000000000001','phase','Vazia')$$,'empty structure can be created');
select lives_ok($$update public.condominium_structures set status='inactive' where condominium_id='d2c20000-0000-4200-8200-000000000001' and name='Vazia'$$,'empty structure can be deactivated without cascade');
select lives_ok($$insert into public.condominium_structures(condominium_id,parent_id,structure_type,name,status) select condominium_id,id,'block','Filha inativa','inactive' from public.condominium_structures where name='Vazia'$$,'inactive child may be preserved under inactive parent');
select throws_ok($$update public.condominium_structures set status='active' where name='Filha inativa'$$,'23514',null,'inactive structure cannot be reactivated under inactive parent');
select lives_ok($$update public.condominium_structures set parent_id='d2c70000-0000-4200-8200-000000000002' where id='d2c70000-0000-4200-8200-000000000004'$$,'structure can be reparented within the same condominium');
select throws_ok($$update public.units set structure_id='d2c70000-0000-4200-8200-000000000002' where id='d2c80000-0000-4200-8200-000000000001'$$,'23505',null,'unit movement fails on destination code conflict');
select lives_ok($$insert into public.condominium_structures(condominium_id,structure_type,name) values ('d2c20000-0000-4200-8200-000000000001','tower','Torre C')$$,'new same-tenant destination structure can be created');
select lives_ok($$update public.units set structure_id=(select id from public.condominium_structures where name='Torre C') where id='d2c80000-0000-4200-8200-000000000001'$$,'unit can move when destination has no normalized code conflict');
select throws_ok($$insert into public.condominium_structures(condominium_id,parent_id,structure_type,name) select condominium_id,id,'block','Filha inválida' from public.condominium_structures where name='Vazia'$$,'23514',null,'active child under inactive parent is rejected');
select throws_ok($$insert into public.units(condominium_id,structure_id,code,unit_type) select condominium_id,id,'inactive-parent-unit','apartment' from public.condominium_structures where name='Vazia'$$,'23514',null,'active unit under inactive structure is rejected');
select throws_ok($$update public.condominiums set timezone='Invalid/Timezone' where id='d2c20000-0000-4200-8200-000000000001'$$,'23514',null,'timezone must be a recognized IANA timezone');
select throws_ok($$insert into public.addresses(street,city,state,postal_code) values ('Rua CEP','São Paulo','SP','123')$$,'23514',null,'Brazilian postal code requires eight digits');
select is((select count(*)::int from public.role_permissions rp join public.roles r on r.id=rp.role_id join public.permissions p on p.id=rp.permission_id where r.code in ('condominium.syndic','condominium.manager') and p.code in ('structures.read','structures.manage','units.read','units.manage')),8,'P2 catalog grants exist only for syndic and manager roles');

set local role authenticated;
select set_config('request.jwt.claim.sub','d2c30000-0000-4200-8200-000000000001',true);
select ok(public.has_permission('structures.read','d2c20000-0000-4200-8200-000000000001'),'tenant A has structure read permission');
select ok(not public.has_permission('structures.read','d2c20000-0000-4200-8200-000000000002'),'tenant A has no structure permission in tenant B');
select is((select count(*)::int from public.condominium_structures where id='d2c70000-0000-4200-8200-000000000001'),1,'tenant A reads its structure');
select is((select count(*)::int from public.condominium_structures where id='d2c70000-0000-4200-8200-000000000003'),0,'tenant A cannot read structure B');
select is((select count(*)::int from public.units where id='d2c80000-0000-4200-8200-000000000001'),1,'tenant A reads its unit');
select is((select count(*)::int from public.units where id='d2c80000-0000-4200-8200-000000000002'),0,'tenant A cannot read unit B');
select is((select count(*)::int from public.addresses where id='d2c90000-0000-4200-8200-000000000001'),1,'tenant A reads address through its authorized condominium');
select is((select count(*)::int from public.addresses where id='d2c90000-0000-4200-8200-000000000002'),0,'tenant A cannot discover address B');
select lives_ok($$select public.save_condominium_profile('d2c20000-0000-4200-8200-000000000001','Tenant A atualizado',null,null,'gestao@example.test','+55 (11) 99999-9999','vertical','America/Sao_Paulo','01310-100','Rua Perfil','100',null,'Bela Vista','São Paulo','SP','BR')$$,'authorized manager atomically updates condominium and address');
select is((select postal_code from public.addresses where id='d2c90000-0000-4200-8200-000000000001'),'01310100'::text,'Brazilian postal code is normalized to eight digits');
select is((select phone from public.condominiums where id='d2c20000-0000-4200-8200-000000000001'),'+5511999999999'::text,'phone is normalized to a leading plus and digits');
select lives_ok($$insert into public.condominium_structures(condominium_id,structure_type,name) values ('d2c20000-0000-4200-8200-000000000001','block','Criado por A')$$,'tenant A can create own structure');
select throws_ok($$insert into public.condominium_structures(condominium_id,structure_type,name) values ('d2c20000-0000-4200-8200-000000000002','block','Tentativa A em B')$$,'42501',null,'tenant A cannot create structure B');
select lives_ok($$insert into public.units(condominium_id,code,unit_type) values ('d2c20000-0000-4200-8200-000000000001','Criada por A','house')$$,'tenant A can create own root unit');
select throws_ok($$insert into public.units(condominium_id,code,unit_type) values ('d2c20000-0000-4200-8200-000000000002','Tentativa A em B','house')$$,'42501',null,'tenant A cannot create unit B');
select throws_ok($$update public.condominium_structures set condominium_id='d2c20000-0000-4200-8200-000000000002' where id='d2c70000-0000-4200-8200-000000000001'$$,'23514',null,'structure tenant is immutable');
select throws_ok($$update public.units set condominium_id='d2c20000-0000-4200-8200-000000000002' where id='d2c80000-0000-4200-8200-000000000001'$$,'23514',null,'unit tenant is immutable');
reset role;
select ok(exists(select 1 from public.audit_events where entity_type='address' and entity_id='d2c90000-0000-4200-8200-000000000001' and metadata->>'condominium_id'='d2c20000-0000-4200-8200-000000000001'),'address audit retains its tenant context');
select ok(exists(select 1 from public.audit_events where entity_type='condominium' and entity_id='d2c20000-0000-4200-8200-000000000001' and actor_auth_user_id='d2c30000-0000-4200-8200-000000000001' and metadata->'changed_fields' @> '["name"]'::jsonb),'condominium audit records actor and changed field names');
select ok(exists(select 1 from public.audit_events where entity_type='unit' and entity_id='d2c80000-0000-4200-8200-000000000001' and metadata->>'condominium_id'='d2c20000-0000-4200-8200-000000000001'),'unit audit records tenant context');

set local role authenticated;
select set_config('request.jwt.claim.sub','d2c30000-0000-4200-8200-000000000004',true);
select ok(not public.has_permission('structures.read','d2c20000-0000-4200-8200-000000000001'),'resident receives no structure catalog permission');
select is((select count(*)::int from public.condominium_structures),0,'resident cannot read administrative structure catalog');
select ok(not public.has_permission('units.read','d2c20000-0000-4200-8200-000000000001'),'resident receives no unit catalog permission');
select is((select count(*)::int from public.units),0,'resident cannot read administrative unit catalog');
select set_config('request.jwt.claim.sub','d2c30000-0000-4200-8200-000000000003',true);
select ok(not public.has_permission('structures.read','d2c20000-0000-4200-8200-000000000001'),'doorman receives no structure administration permission');
select is((select count(*)::int from public.units),0,'doorman cannot read unit catalog');
select set_config('request.jwt.claim.sub','d2c30000-0000-4200-8200-000000000005',true);
select ok(public.has_permission('structures.read','d2c20000-0000-4200-8200-000000000001'),'read-only actor has read permission');
select ok(not public.has_permission('structures.manage','d2c20000-0000-4200-8200-000000000001'),'read-only actor has no manage permission');
select is((select count(*)::int from public.condominium_structures),7,'read-only actor can read structure catalog');
select throws_ok($$insert into public.condominium_structures(condominium_id,structure_type,name) values ('d2c20000-0000-4200-8200-000000000001','block','Read-only write')$$,'42501',null,'read-only actor cannot write');
reset role;

select ok(public.has_condominium_access('d2c20000-0000-4200-8200-000000000001'),'active membership grants access before it ends');
update public.condominium_memberships set status='ended', starts_at=now()-interval '2 days', ends_at=now()-interval '1 day' where id='d2c60000-0000-4200-8200-000000000005';
set local role authenticated;
select set_config('request.jwt.claim.sub','d2c30000-0000-4200-8200-000000000005',true);
select ok(not public.has_condominium_access('d2c20000-0000-4200-8200-000000000001'),'ended membership blocks access to P2 records');
reset role;
update public.user_accounts set status='suspended' where id='d2c50000-0000-4200-8200-000000000005';
set local role authenticated;
select set_config('request.jwt.claim.sub','d2c30000-0000-4200-8200-000000000005',true);
select is(public.current_user_account_id(),null::uuid,'suspended account has no P2 data access');
reset role;
insert into public.permission_overrides(user_account_id,permission_id,condominium_id,effect,reason)
values ('d2c50000-0000-4200-8200-000000000001',(select id from public.permissions where code='structures.read'),'d2c20000-0000-4200-8200-000000000001','deny','P2 deny precedence test');
set local role authenticated;
select set_config('request.jwt.claim.sub','d2c30000-0000-4200-8200-000000000001',true);
select ok(not public.has_permission('structures.read','d2c20000-0000-4200-8200-000000000001'),'P1 DENY override still blocks P2 permission');
select is((select count(*)::int from public.condominium_structures),0,'P1 DENY override hides P2 structure rows');
reset role;

select * from finish();
rollback;
