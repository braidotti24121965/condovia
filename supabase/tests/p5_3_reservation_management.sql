begin;
select plan(23);

insert into public.clients(id,legal_name) values ('d5310000-0000-4000-8000-000000000001','P5.3 Test Client');
insert into public.condominiums(id,client_id,name,timezone) values
 ('d5310100-0000-4000-8000-000000000001','d5310000-0000-4000-8000-000000000001','P5.3 Alpha','America/Sao_Paulo'),
 ('d5310100-0000-4000-8000-000000000002','d5310000-0000-4000-8000-000000000001','P5.3 Beta','America/Sao_Paulo');
insert into auth.users(id,aud,role,email) values
 ('d5311000-0000-4000-8000-000000000001','authenticated','authenticated','p53-admin@test.local'),
 ('d5311000-0000-4000-8000-000000000002','authenticated','authenticated','p53-resident@test.local'),
 ('d5311000-0000-4000-8000-000000000003','authenticated','authenticated','p53-no-permission@test.local'),
 ('d5311000-0000-4000-8000-000000000004','authenticated','authenticated','p53-beta-admin@test.local');
insert into public.people(id,full_name) values
 ('d5311100-0000-4000-8000-000000000001','P5.3 Admin'),('d5311100-0000-4000-8000-000000000002','P5.3 Resident'),('d5311100-0000-4000-8000-000000000003','P5.3 Restricted'),('d5311100-0000-4000-8000-000000000004','P5.3 Beta Admin');
insert into public.user_accounts(id,auth_user_id,person_id) values
 ('d5311200-0000-4000-8000-000000000001','d5311000-0000-4000-8000-000000000001','d5311100-0000-4000-8000-000000000001'),('d5311200-0000-4000-8000-000000000002','d5311000-0000-4000-8000-000000000002','d5311100-0000-4000-8000-000000000002'),('d5311200-0000-4000-8000-000000000003','d5311000-0000-4000-8000-000000000003','d5311100-0000-4000-8000-000000000003'),('d5311200-0000-4000-8000-000000000004','d5311000-0000-4000-8000-000000000004','d5311100-0000-4000-8000-000000000004');
insert into public.condominium_memberships(condominium_id,user_account_id) values
 ('d5310100-0000-4000-8000-000000000001','d5311200-0000-4000-8000-000000000001'),('d5310100-0000-4000-8000-000000000001','d5311200-0000-4000-8000-000000000002'),('d5310100-0000-4000-8000-000000000001','d5311200-0000-4000-8000-000000000003'),('d5310100-0000-4000-8000-000000000002','d5311200-0000-4000-8000-000000000004');
insert into public.person_condominium_links(condominium_id,person_id) values
 ('d5310100-0000-4000-8000-000000000001','d5311100-0000-4000-8000-000000000001'),('d5310100-0000-4000-8000-000000000001','d5311100-0000-4000-8000-000000000002'),('d5310100-0000-4000-8000-000000000001','d5311100-0000-4000-8000-000000000003'),('d5310100-0000-4000-8000-000000000002','d5311100-0000-4000-8000-000000000004');
insert into public.role_assignments(user_account_id,role_id,condominium_id) select 'd5311200-0000-4000-8000-000000000001',id,'d5310100-0000-4000-8000-000000000001' from public.roles where code='condominium.syndic';
insert into public.role_assignments(user_account_id,role_id,condominium_id) select 'd5311200-0000-4000-8000-000000000002',id,'d5310100-0000-4000-8000-000000000001' from public.roles where code='condominium.resident';
insert into public.role_assignments(user_account_id,role_id,condominium_id) select 'd5311200-0000-4000-8000-000000000004',id,'d5310100-0000-4000-8000-000000000002' from public.roles where code='condominium.syndic';
insert into public.units(id,condominium_id,code,unit_type) values ('d5312000-0000-4000-8000-000000000001','d5310100-0000-4000-8000-000000000001','A1','apartment'),('d5312000-0000-4000-8000-000000000002','d5310100-0000-4000-8000-000000000002','B1','apartment');
insert into public.unit_occupancies(condominium_id,unit_id,person_id,occupancy_type,starts_at) values ('d5310100-0000-4000-8000-000000000001','d5312000-0000-4000-8000-000000000001','d5311100-0000-4000-8000-000000000002','tenant',current_date);
insert into public.reservable_resources(id,condominium_id,name,cancellation_allowed,cancellation_deadline_minutes) values ('d5313000-0000-4000-8000-000000000001','d5310100-0000-4000-8000-000000000001','Salão Alpha',true,0),('d5313000-0000-4000-8000-000000000002','d5310100-0000-4000-8000-000000000001','Recurso Sem Cancelamento',false,0),('d5313000-0000-4000-8000-000000000003','d5310100-0000-4000-8000-000000000002','Salão Beta',true,0),('d5313000-0000-4000-8000-000000000004','d5310100-0000-4000-8000-000000000001','Prazo de Cancelamento',true,60);

insert into public.reservations(id,condominium_id,resource_id,unit_id,requester_person_id,starts_at,ends_at,status) values
 ('d5314000-0000-4000-8000-000000000001','d5310100-0000-4000-8000-000000000001','d5313000-0000-4000-8000-000000000001','d5312000-0000-4000-8000-000000000001','d5311100-0000-4000-8000-000000000002','2027-01-01 10:00+00','2027-01-01 11:00+00','pending'),
 ('d5314000-0000-4000-8000-000000000002','d5310100-0000-4000-8000-000000000001','d5313000-0000-4000-8000-000000000001','d5312000-0000-4000-8000-000000000001','d5311100-0000-4000-8000-000000000002','2027-01-01 12:00+00','2027-01-01 13:00+00','pending'),
 ('d5314000-0000-4000-8000-000000000003','d5310100-0000-4000-8000-000000000001','d5313000-0000-4000-8000-000000000001','d5312000-0000-4000-8000-000000000001','d5311100-0000-4000-8000-000000000002','2027-01-01 14:00+00','2027-01-01 15:00+00','pending'),
 ('d5314000-0000-4000-8000-000000000004','d5310100-0000-4000-8000-000000000001','d5313000-0000-4000-8000-000000000001','d5312000-0000-4000-8000-000000000001','d5311100-0000-4000-8000-000000000002','2027-01-01 16:00+00','2027-01-01 17:00+00','approved'),
 ('d5314000-0000-4000-8000-000000000005','d5310100-0000-4000-8000-000000000001','d5313000-0000-4000-8000-000000000001','d5312000-0000-4000-8000-000000000001','d5311100-0000-4000-8000-000000000002','2027-01-01 18:00+00','2027-01-01 19:00+00','rejected'),
 ('d5314000-0000-4000-8000-000000000006','d5310100-0000-4000-8000-000000000001','d5313000-0000-4000-8000-000000000001','d5312000-0000-4000-8000-000000000001','d5311100-0000-4000-8000-000000000002','2027-01-01 20:00+00','2027-01-01 21:00+00','cancelled'),
 ('d5314000-0000-4000-8000-000000000007','d5310100-0000-4000-8000-000000000002','d5313000-0000-4000-8000-000000000003','d5312000-0000-4000-8000-000000000002','d5311100-0000-4000-8000-000000000004','2027-01-02 10:00+00','2027-01-02 11:00+00','pending'),
 ('d5314000-0000-4000-8000-000000000008','d5310100-0000-4000-8000-000000000001','d5313000-0000-4000-8000-000000000004','d5312000-0000-4000-8000-000000000001','d5311100-0000-4000-8000-000000000002',now() + interval '30 minutes',now() + interval '90 minutes','approved'),
 ('d5314000-0000-4000-8000-000000000009','d5310100-0000-4000-8000-000000000001','d5313000-0000-4000-8000-000000000002','d5312000-0000-4000-8000-000000000001','d5311100-0000-4000-8000-000000000002',now() + interval '2 hours',now() + interval '3 hours','approved');

set local role authenticated;
select set_config('request.jwt.claim.sub','d5311000-0000-4000-8000-000000000001',true);
select lives_ok($$select public.manage_reservation('d5314000-0000-4000-8000-000000000001','approve',null)$$,'pending to approved');
select is((select status from public.reservations where id='d5314000-0000-4000-8000-000000000001'),'approved','approved status persisted');
select lives_ok($$select public.manage_reservation('d5314000-0000-4000-8000-000000000002','reject','lotado')$$,'pending to rejected');
select is((select status from public.reservations where id='d5314000-0000-4000-8000-000000000002'),'rejected','rejected status persisted');
select lives_ok($$select public.manage_reservation('d5314000-0000-4000-8000-000000000003','cancel','desistência')$$,'pending to cancelled');
select is((select status from public.reservations where id='d5314000-0000-4000-8000-000000000003'),'cancelled','pending cancellation persisted');
select lives_ok($$select public.manage_reservation('d5314000-0000-4000-8000-000000000004','cancel','ajuste')$$,'approved to cancelled');
select is((select status from public.reservations where id='d5314000-0000-4000-8000-000000000004'),'cancelled','approved cancellation persisted');
select throws_ok($$select public.manage_reservation('d5314000-0000-4000-8000-000000000005','approve',null)$$,'23514',null,'rejected to approved blocked');
select throws_ok($$select public.manage_reservation('d5314000-0000-4000-8000-000000000006','approve',null)$$,'23514',null,'cancelled to approved blocked');
select throws_ok($$update public.reservations set status='pending' where id='d5314000-0000-4000-8000-000000000001'$$,'42501',null,'approved to pending blocked');
select set_config('request.jwt.claim.sub','d5311000-0000-4000-8000-000000000003',true);
select throws_ok($$select public.manage_reservation('d5314000-0000-4000-8000-000000000007','approve',null)$$,'42501',null,'unauthorized user cannot approve');
select throws_ok($$select public.manage_reservation('d5314000-0000-4000-8000-000000000007','reject','não permitido')$$,'42501',null,'unauthorized user cannot reject');
select set_config('request.jwt.claim.sub','d5311000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.manage_reservation('d5314000-0000-4000-8000-000000000007','approve',null)$$,'42501',null,'cross tenant management blocked');
select throws_ok($$insert into public.reservations(id,condominium_id,resource_id,unit_id,requester_person_id,starts_at,ends_at,status) values ('d5314000-0000-4000-8000-000000000010','d5310100-0000-4000-8000-000000000001','d5313000-0000-4000-8000-000000000001','d5312000-0000-4000-8000-000000000001','d5311100-0000-4000-8000-000000000002','2027-01-01 10:30+00','2027-01-01 10:45+00','pending')$$,'23P01',null,'overlapping protected reservation rejected before approval');
select is((select count(*)::int from public.reservations where resource_id='d5313000-0000-4000-8000-000000000001' and status in ('pending','approved') and tstzrange(starts_at,ends_at,'[)') && tstzrange('2027-01-01 10:30+00','2027-01-01 10:45+00','[)')),1,'no conflicting protected reservations coexist');
select set_config('request.jwt.claim.sub','d5311000-0000-4000-8000-000000000002',true);
select throws_ok($$select public.manage_reservation('d5314000-0000-4000-8000-000000000008','cancel','fora do prazo')$$,'23514',null,'cancellation rule enforced');
select throws_ok($$select public.manage_reservation('d5314000-0000-4000-8000-000000000009','cancel','recurso sem cancelamento')$$,'23514',null,'resource cancellation rule enforced');
select set_config('request.jwt.claim.sub','d5311000-0000-4000-8000-000000000004',true);
select lives_ok($$select public.manage_reservation('d5314000-0000-4000-8000-000000000007','approve',null)$$,'beta admin approves own tenant reservation');
select is((select status from public.reservations where id='d5314000-0000-4000-8000-000000000007'),'approved','approval conflict setup');
select set_config('request.jwt.claim.sub','d5311000-0000-4000-8000-000000000001',true);
select is((select count(*)::int from public.reservation_status_history where reservation_id='d5314000-0000-4000-8000-000000000001' and previous_status='pending' and new_status='approved' and changed_by_user_account_id='d5311200-0000-4000-8000-000000000001'),1,'approval audit persisted');
select is((select count(*)::int from public.reservation_status_history where reservation_id='d5314000-0000-4000-8000-000000000002' and previous_status='pending' and new_status='rejected' and reason='lotado'),1,'rejection audit persisted');
select is((select count(*)::int from public.reservation_status_history where reservation_id='d5314000-0000-4000-8000-000000000003' and previous_status='pending' and new_status='cancelled' and reason='desistência'),1,'cancellation audit persisted');
select * from finish();
rollback;
