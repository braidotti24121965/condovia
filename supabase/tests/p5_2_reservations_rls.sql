begin;
select plan(12);

insert into public.clients(id, legal_name) values ('d5210000-0000-4000-8000-000000000001','P5.2 Test Client');
insert into public.condominiums(id, client_id, name, timezone) values
  ('d5210100-0000-4000-8000-000000000001','d5210000-0000-4000-8000-000000000001','P5.2 Alpha','America/Sao_Paulo'),
  ('d5210100-0000-4000-8000-000000000002','d5210000-0000-4000-8000-000000000001','P5.2 Beta','America/Sao_Paulo');
insert into auth.users(id,aud,role,email) values
  ('d5211000-0000-4000-8000-000000000001','authenticated','authenticated','p52-syndic@test.local'),
  ('d5211000-0000-4000-8000-000000000002','authenticated','authenticated','p52-resident@test.local'),
  ('d5211000-0000-4000-8000-000000000003','authenticated','authenticated','p52-doorman@test.local');
insert into public.people(id,full_name) values
  ('d5211100-0000-4000-8000-000000000001','P5.2 Síndico'),
  ('d5211100-0000-4000-8000-000000000002','P5.2 Morador'),
  ('d5211100-0000-4000-8000-000000000003','P5.2 Porteiro');
insert into public.user_accounts(id,auth_user_id,person_id) values
  ('d5211200-0000-4000-8000-000000000001','d5211000-0000-4000-8000-000000000001','d5211100-0000-4000-8000-000000000001'),
  ('d5211200-0000-4000-8000-000000000002','d5211000-0000-4000-8000-000000000002','d5211100-0000-4000-8000-000000000002'),
  ('d5211200-0000-4000-8000-000000000003','d5211000-0000-4000-8000-000000000003','d5211100-0000-4000-8000-000000000003');
insert into public.condominium_memberships(condominium_id,user_account_id) values
  ('d5210100-0000-4000-8000-000000000001','d5211200-0000-4000-8000-000000000001'),('d5210100-0000-4000-8000-000000000001','d5211200-0000-4000-8000-000000000002'),('d5210100-0000-4000-8000-000000000001','d5211200-0000-4000-8000-000000000003'),('d5210100-0000-4000-8000-000000000002','d5211200-0000-4000-8000-000000000001');
insert into public.person_condominium_links(condominium_id,person_id) values ('d5210100-0000-4000-8000-000000000001','d5211100-0000-4000-8000-000000000001'),('d5210100-0000-4000-8000-000000000001','d5211100-0000-4000-8000-000000000002'),('d5210100-0000-4000-8000-000000000001','d5211100-0000-4000-8000-000000000003');
insert into public.role_assignments(user_account_id,role_id,condominium_id) select 'd5211200-0000-4000-8000-000000000001',id,'d5210100-0000-4000-8000-000000000001' from public.roles where code='condominium.syndic';
insert into public.role_assignments(user_account_id,role_id,condominium_id) select 'd5211200-0000-4000-8000-000000000002',id,'d5210100-0000-4000-8000-000000000001' from public.roles where code='condominium.resident';
insert into public.role_assignments(user_account_id,role_id,condominium_id) select 'd5211200-0000-4000-8000-000000000003',id,'d5210100-0000-4000-8000-000000000001' from public.roles where code='condominium.doorman';
insert into public.units(id,condominium_id,code,unit_type) values ('d5212000-0000-4000-8000-000000000001','d5210100-0000-4000-8000-000000000001','A1','apartment'),('d5212000-0000-4000-8000-000000000002','d5210100-0000-4000-8000-000000000002','B1','apartment'),('d5212000-0000-4000-8000-000000000003','d5210100-0000-4000-8000-000000000001','A2','apartment');
insert into public.unit_occupancies(condominium_id,unit_id,person_id,occupancy_type,starts_at) values ('d5210100-0000-4000-8000-000000000001','d5212000-0000-4000-8000-000000000001','d5211100-0000-4000-8000-000000000002','tenant',current_date);
insert into public.reservable_resources(id,condominium_id,name) values ('d5213000-0000-4000-8000-000000000001','d5210100-0000-4000-8000-000000000001','Salão Alpha'),('d5213000-0000-4000-8000-000000000002','d5210100-0000-4000-8000-000000000002','Salão Beta');

set local role authenticated;
select set_config('request.jwt.claim.sub','d5211000-0000-4000-8000-000000000002',true);
select ok(not public.has_permission('reservations.create','d5210100-0000-4000-8000-000000000001'),'resident does not have administrative reservation permission');
insert into public.reservations(condominium_id,resource_id,unit_id,requester_person_id,starts_at,ends_at,status) values ('d5210100-0000-4000-8000-000000000001','d5213000-0000-4000-8000-000000000001','d5212000-0000-4000-8000-000000000001','d5211100-0000-4000-8000-000000000002','2027-01-01 12:00+00','2027-01-01 13:00+00','approved');
select is((select count(*)::int from public.reservations where condominium_id='d5210100-0000-4000-8000-000000000001'),1,'resident reads own tenant reservation');
select is((select count(*)::int from public.reservations where condominium_id='d5210100-0000-4000-8000-000000000002'),0,'tenant isolation hides beta');
select throws_ok($$insert into public.reservations(condominium_id,resource_id,unit_id,requester_person_id,starts_at,ends_at,status) values ('d5210100-0000-4000-8000-000000000002','d5213000-0000-4000-8000-000000000002','d5212000-0000-4000-8000-000000000002','d5211100-0000-4000-8000-000000000002','2027-01-02 12:00+00','2027-01-02 13:00+00','approved')$$,'42501',null,'resident cannot create in another tenant');
select throws_ok($$insert into public.reservations(condominium_id,resource_id,unit_id,requester_person_id,starts_at,ends_at,status) values ('d5210100-0000-4000-8000-000000000001','d5213000-0000-4000-8000-000000000001','d5212000-0000-4000-8000-000000000001','d5211100-0000-4000-8000-000000000003','2027-01-03 12:00+00','2027-01-03 13:00+00','approved')$$,'42501',null,'resident cannot forge requester');
select throws_ok($$insert into public.reservations(condominium_id,resource_id,unit_id,requester_person_id,starts_at,ends_at,status) values ('d5210100-0000-4000-8000-000000000001','d5213000-0000-4000-8000-000000000001','d5212000-0000-4000-8000-000000000003','d5211100-0000-4000-8000-000000000002','2027-01-04 12:00+00','2027-01-04 13:00+00','approved')$$,'42501',null,'resident cannot use valid unlinked unit');
select throws_ok($$update public.reservations set condominium_id='d5210100-0000-4000-8000-000000000002' where condominium_id='d5210100-0000-4000-8000-000000000001'$$,'23514',null,'cross tenant update denied by immutable scope guard');
select throws_ok($$delete from public.reservations$$,'42501',null,'physical delete denied');
set local role authenticated;
select set_config('request.jwt.claim.sub','d5211000-0000-4000-8000-000000000003',true);
select throws_ok($$insert into public.reservations(condominium_id,resource_id,unit_id,requester_person_id,starts_at,ends_at,status) values ('d5210100-0000-4000-8000-000000000001','d5213000-0000-4000-8000-000000000001','d5212000-0000-4000-8000-000000000001','d5211100-0000-4000-8000-000000000003','2027-01-05 12:00+00','2027-01-05 13:00+00','approved')$$,'42501',null,'doorman has no reservation admin access');
select has_table('public','reservations','reservations table exists');
select is((select count(*)::int from pg_constraint where conname='reservations_active_no_overlap'),1,'overlap exclusion exists');
select is((select count(*)::int from pg_policies where schemaname='public' and tablename='reservations'),3,'reservation policies exist');
select * from finish();
rollback;
