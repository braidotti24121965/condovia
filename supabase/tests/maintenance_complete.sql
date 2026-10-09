-- Focused technical regression: monetary authorization, tenancy, immutable documents,
-- contract prerequisites, checklist, expenses and preventive idempotency.
-- Synthetic fixtures are transactional and never committed.
begin;
create function pg_temp.expect_failure(statement text, expected text) returns void language plpgsql as $$ begin
 begin execute statement; exception when others then
  if position(expected in sqlerrm)>0 then return; end if;
  raise exception 'Unexpected failure: % (expected %)',sqlerrm,expected;
 end;
 raise exception 'Expected failure did not occur: %',statement;
end $$;
create function pg_temp.assert_true(result boolean,label text) returns void language plpgsql as $$ begin if result is distinct from true then raise exception 'Assertion failed: %',label; end if; end $$;

insert into public.clients(id,legal_name) values('ac000000-0000-4000-8000-000000000001','Maintenance synthetic client');
insert into public.condominiums(id,client_id,name) values
 ('ac000000-0000-4000-8000-000000000010','ac000000-0000-4000-8000-000000000001','Maintenance A'),
 ('ac000000-0000-4000-8000-000000000020','ac000000-0000-4000-8000-000000000001','Maintenance B');
insert into public.condominium_structures(id,condominium_id,structure_type,name) values
 ('ac000000-0000-4000-8000-000000000011','ac000000-0000-4000-8000-000000000010','building','Common area A'),
 ('ac000000-0000-4000-8000-000000000021','ac000000-0000-4000-8000-000000000020','building','Common area B');
insert into auth.users(id,email) values
 ('ac000000-0000-4000-8000-000000000101','syndic@maintenance.test'),
 ('ac000000-0000-4000-8000-000000000102','council@maintenance.test'),
 ('ac000000-0000-4000-8000-000000000103','doorman@maintenance.test');
insert into public.people(id,full_name) values
 ('ac000000-0000-4000-8000-000000000201','Synthetic Syndic'),
 ('ac000000-0000-4000-8000-000000000202','Synthetic Council'),
 ('ac000000-0000-4000-8000-000000000203','Synthetic Doorman');
insert into public.user_accounts(id,auth_user_id,person_id) values
 ('ac000000-0000-4000-8000-000000000301','ac000000-0000-4000-8000-000000000101','ac000000-0000-4000-8000-000000000201'),
 ('ac000000-0000-4000-8000-000000000302','ac000000-0000-4000-8000-000000000102','ac000000-0000-4000-8000-000000000202'),
 ('ac000000-0000-4000-8000-000000000303','ac000000-0000-4000-8000-000000000103','ac000000-0000-4000-8000-000000000203');
insert into public.condominium_memberships(condominium_id,user_account_id)
 select 'ac000000-0000-4000-8000-000000000010',id from public.user_accounts where id in ('ac000000-0000-4000-8000-000000000301','ac000000-0000-4000-8000-000000000302','ac000000-0000-4000-8000-000000000303');
insert into public.role_assignments(user_account_id,role_id,condominium_id)
 select a.account_id::uuid,r.id,'ac000000-0000-4000-8000-000000000010' from (values
 ('ac000000-0000-4000-8000-000000000301','condominium.syndic'),
 ('ac000000-0000-4000-8000-000000000302','condominium.council'),
 ('ac000000-0000-4000-8000-000000000303','condominium.doorman')) a(account_id,role_code) join public.roles r on r.code=a.role_code;
insert into public.maintenance_settings(condominium_id,financial_approval_limit) values('ac000000-0000-4000-8000-000000000010',500);
insert into public.service_providers(id,condominium_id,full_name) values
 ('ac000000-0000-4000-8000-000000000401','ac000000-0000-4000-8000-000000000010','Provider A'),
 ('ac000000-0000-4000-8000-000000000402','ac000000-0000-4000-8000-000000000020','Provider B');
select set_config('request.jwt.claim.sub','ac000000-0000-4000-8000-000000000101',true);
set local role authenticated;
select pg_temp.assert_true(public.has_permission('maintenance.finance.manage','ac000000-0000-4000-8000-000000000010'),'syndic authorization');
select pg_temp.expect_failure($q$ select public.save_maintenance_contract('ac000000-0000-4000-8000-000000000020',null,'ac000000-0000-4000-8000-000000000402','Cross tenant',current_date,current_date+30,1,'active','') $q$,'Permissão negada');
select pg_temp.expect_failure($q$ select public.list_maintenance_work_order_assignees('ac000000-0000-4000-8000-000000000020') $q$,'Permissão negada');
reset role;
create temporary table test_order as select * from public.create_maintenance_work_order(null,'ac000000-0000-4000-8000-000000000011',null,'Full maintenance technical check','medium','ac000000-0000-4000-8000-000000000301','ac000000-0000-4000-8000-000000000401',current_date+3);
grant select on test_order to authenticated;
set local role authenticated;
select public.update_maintenance_order_details(id,'corrective',null,null,'ac000000-0000-4000-8000-000000000401',null,1000,1000,null) from test_order;
select pg_temp.expect_failure(format('select public.transition_maintenance_work_order(%L,%L)',id,'start'),'Aprovação financeira pendente') from test_order;
select public.request_maintenance_financial_approval(id) from test_order;
select pg_temp.assert_true((select count(*)=2 from public.maintenance_approval_steps where work_order_id=(select id from test_order)),'default threshold adds council');
select public.decide_maintenance_financial_approval(s.id,'approved','Syndic review') from public.maintenance_approval_steps s join public.roles r on r.id=s.role_id where s.work_order_id=(select id from test_order) and r.code='condominium.syndic';
select pg_temp.expect_failure(format('select public.transition_maintenance_work_order(%L,%L)',id,'start'),'Aprovação financeira pendente') from test_order;
select pg_temp.expect_failure(format('select public.decide_maintenance_financial_approval(%L,%L,%L)',s.id,'approved','Unauthorized profile'),'Perfil fora da alçada') from public.maintenance_approval_steps s join public.roles r on r.id=s.role_id where s.work_order_id=(select id from test_order) and r.code='condominium.council';
reset role;
select set_config('request.jwt.claim.sub','ac000000-0000-4000-8000-000000000102',true);
set local role authenticated;
select public.decide_maintenance_financial_approval(s.id,'approved','Council review') from public.maintenance_approval_steps s join public.roles r on r.id=s.role_id where s.work_order_id=(select id from test_order) and r.code='condominium.council';
select pg_temp.assert_true((public.get_maintenance_order_finances((select id from test_order))->>'approved_amount')::numeric=1000,'full approval amount');
reset role;
select set_config('request.jwt.claim.sub','ac000000-0000-4000-8000-000000000101',true);
set local role authenticated;
select public.update_maintenance_order_details(id,'corrective',null,null,'ac000000-0000-4000-8000-000000000401',null,1200,1200,null) from test_order;
select pg_temp.expect_failure(format('select public.transition_maintenance_work_order(%L,%L)',id,'start'),'Aprovação financeira pendente') from test_order;
select public.request_maintenance_financial_approval(id) from test_order;
select pg_temp.assert_true((select count(distinct revision)=2 from public.maintenance_approval_steps where work_order_id=(select id from test_order)),'revision history preserved');
select public.decide_maintenance_financial_approval(s.id,'rejected','Rejected budget') from public.maintenance_approval_steps s join public.roles r on r.id=s.role_id where s.work_order_id=(select id from test_order) and s.revision=(public.get_maintenance_order_finances((select id from test_order))->>'financial_revision')::integer and r.code='condominium.syndic';
select public.request_maintenance_financial_approval(id) from test_order;
select public.decide_maintenance_financial_approval(s.id,'approved','Revised syndic review') from public.maintenance_approval_steps s join public.roles r on r.id=s.role_id where s.work_order_id=(select id from test_order) and s.revision=(public.get_maintenance_order_finances((select id from test_order))->>'financial_revision')::integer and r.code='condominium.syndic';
reset role;
select set_config('request.jwt.claim.sub','ac000000-0000-4000-8000-000000000102',true);
set local role authenticated;
select public.decide_maintenance_financial_approval(s.id,'approved','Revised council review') from public.maintenance_approval_steps s join public.roles r on r.id=s.role_id where s.work_order_id=(select id from test_order) and s.revision=(public.get_maintenance_order_finances((select id from test_order))->>'financial_revision')::integer and r.code='condominium.council';
reset role;
select set_config('request.jwt.claim.sub','ac000000-0000-4000-8000-000000000101',true);
set local role authenticated;
select public.transition_maintenance_work_order(id,'start') from test_order;
select public.save_maintenance_checklist(id,null,'Required inspection',true,false) from test_order;
select public.update_maintenance_work_order_activity(id,'Repair completed','Technical check','Completed and inspected') from test_order;
select pg_temp.expect_failure(format('select public.transition_maintenance_work_order(%L,%L)',id,'submit_validation'),'Checklist obrigatório incompleto') from test_order;
select public.save_maintenance_checklist(work_order_id,id,description,true,true) from public.maintenance_checklist_items where work_order_id=(select id from test_order);
select public.transition_maintenance_work_order(id,'submit_validation') from test_order;
select public.transition_maintenance_work_order(id,'validate') from test_order;
select pg_temp.assert_true((select count(*)=1 and max(amount)=1200 from public.maintenance_expenses where work_order_id=(select id from test_order)),'one expense generated');
select pg_temp.expect_failure(format('select public.update_maintenance_order_details(%L,%L,null,null,null,null,1,1,null)',id,'corrective'),'OS encerrada') from test_order;
select pg_temp.expect_failure(format('select public.transition_maintenance_work_order_p83(%L,%L,null,null)',id,'start'),'permission denied') from test_order;
reset role;
-- Document requirement gates and cross-tenant FK checks.
create temporary table doc_order as select * from public.create_maintenance_work_order(null,'ac000000-0000-4000-8000-000000000011',null,'Document gated work','medium','ac000000-0000-4000-8000-000000000301',null,null);
create temporary table test_service as select public.save_maintenance_service_type('ac000000-0000-4000-8000-000000000010',null,'Inspection',false,'active') id;
grant select on doc_order,test_service to authenticated;
set local role authenticated;
select public.update_maintenance_order_details(id,'inspection',(select id from test_service),null,null,null,0,0,null) from doc_order;
select public.save_maintenance_document_requirement('ac000000-0000-4000-8000-000000000010',(select id from test_service),'report','start');
select pg_temp.expect_failure(format('select public.transition_maintenance_work_order(%L,%L)',id,'start'),'Documentação obrigatória ausente') from doc_order;
select pg_temp.expect_failure(format('select public.update_maintenance_order_details(%L,%L,null,null,%L,null,0,0,null)',id,'corrective','ac000000-0000-4000-8000-000000000402'),'Prestador inválido') from doc_order;
reset role;
insert into storage.objects(bucket_id,name,owner_id,metadata) values('maintenance-documents','ac000000-0000-4000-8000-000000000010/ac000000-0000-4000-8000-000000000501','ac000000-0000-4000-8000-000000000101','{"size":100,"mimetype":"application/pdf"}');
set local role authenticated;
select public.register_maintenance_document('ac000000-0000-4000-8000-000000000010',null,'ac000000-0000-4000-8000-000000000501',id,null,null,null,'Inspection report','report','report.pdf','application/pdf',100) from doc_order;
select public.transition_maintenance_work_order(id,'start') from doc_order;
select pg_temp.expect_failure($q$ update public.maintenance_document_versions set version=99 $q$,'permission denied');
select pg_temp.assert_true((select count(*)=1 from public.maintenance_document_versions),'one immutable version');
reset role;
-- Financial reads are unavailable to an operational-only role, both columns and RPCs.
select set_config('request.jwt.claim.sub','ac000000-0000-4000-8000-000000000103',true);
set local role authenticated;
select pg_temp.expect_failure($q$ select estimated_amount from public.maintenance_work_orders $q$,'permission denied');
select pg_temp.expect_failure(format('select public.get_maintenance_order_finances(%L)',id),'Permissão negada') from test_order;
select pg_temp.assert_true((select count(*)=0 from public.maintenance_document_versions),'document RLS denies operational-only role');
select pg_temp.assert_true((select count(*)=0 from public.maintenance_expenses),'expense RLS denies operational-only role');
reset role;
-- Plans generate the due cycle exactly once and copy required checklist.
select set_config('request.jwt.claim.sub','ac000000-0000-4000-8000-000000000101',true);
create temporary table test_plan as select public.save_maintenance_plan('ac000000-0000-4000-8000-000000000010',null,'ac000000-0000-4000-8000-000000000011',null,null,null,null,'ac000000-0000-4000-8000-000000000301','Monthly preventive',30,current_date,7,0,array['Inspect pump','Inspect seal'],'active') id;
set local role authenticated;
select pg_temp.assert_true(public.generate_due_maintenance_orders('ac000000-0000-4000-8000-000000000010')=1,'due cycle generated');
select pg_temp.assert_true(public.generate_due_maintenance_orders('ac000000-0000-4000-8000-000000000010')=0,'generation idempotent');
reset role;
select pg_temp.assert_true((select next_due_on=current_date+30 from public.maintenance_plans where id=(select id from test_plan)),'next cycle advanced');
select pg_temp.assert_true((select count(*)=2 from public.maintenance_checklist_items where work_order_id=(select id from public.maintenance_work_orders where plan_id=(select id from test_plan))),'plan checklist copied');
select pg_temp.assert_true((select count(*)>0 from public.audit_events where entity_type='maintenance_approval'),'approvals audited');
-- Additional documentation versions preserve history and registered files cannot be deleted,
-- even when a financial manager has an explicit denial of document read access.
insert into storage.objects(bucket_id,name,owner_id,metadata) values('maintenance-documents','ac000000-0000-4000-8000-000000000010/ac000000-0000-4000-8000-000000000502','ac000000-0000-4000-8000-000000000101','{"size":200,"mimetype":"application/pdf"}');
set local role authenticated;
select public.register_maintenance_document('ac000000-0000-4000-8000-000000000010',(select id from public.maintenance_documents where work_order_id=(select id from doc_order)),'ac000000-0000-4000-8000-000000000502',(select id from doc_order),null,null,null,'Ignored immutable title','report','report-v2.pdf','application/pdf',200);
select pg_temp.assert_true((select count(*)=2 and max(version)=2 from public.maintenance_document_versions),'new version preserves prior version');
delete from storage.objects where name='ac000000-0000-4000-8000-000000000010/ac000000-0000-4000-8000-000000000501';
select pg_temp.assert_true((select count(*)=1 from storage.objects where name='ac000000-0000-4000-8000-000000000010/ac000000-0000-4000-8000-000000000501'),'registered file cannot be deleted');
reset role;
insert into public.permission_overrides(user_account_id,permission_id,condominium_id,effect,reason) select 'ac000000-0000-4000-8000-000000000301',id,'ac000000-0000-4000-8000-000000000010','deny','Synthetic deny for storage integrity' from public.permissions where code='maintenance.documents.read';
set local role authenticated;
delete from storage.objects where name='ac000000-0000-4000-8000-000000000010/ac000000-0000-4000-8000-000000000501';
reset role;
select pg_temp.assert_true((select count(*)=1 from storage.objects where name='ac000000-0000-4000-8000-000000000010/ac000000-0000-4000-8000-000000000501'),'hidden version cannot cause registered file deletion');
delete from public.permission_overrides where user_account_id='ac000000-0000-4000-8000-000000000301';

-- Official DV sample and invalid supplier documents.
select pg_temp.assert_true(maintenance_private.valid_supplier_cnpj('12.ABC.345/01DE-35'),'alphanumeric CNPJ DV');
select pg_temp.assert_true(maintenance_private.valid_supplier_cnpj('11.222.333/0001-81'),'numeric CNPJ DV');
set local role authenticated;
select pg_temp.expect_failure($q$ select public.save_maintenance_provider('ac000000-0000-4000-8000-000000000010',null,'Invalid CPF','','cpf','11111111111','','','','','active') $q$,'CPF inválido');
select pg_temp.expect_failure($q$ select public.save_maintenance_provider('ac000000-0000-4000-8000-000000000010',null,'Invalid CNPJ','','cnpj','12ABC34501DE00','','','','','active') $q$,'CNPJ inválido');
select pg_temp.expect_failure($q$ select maintenance_private.daily() $q$,'permission denied');
reset role;

-- Contract requirement cannot be bypassed by creating directly or changing suppliers.
create temporary table required_contract_type as select public.save_maintenance_service_type('ac000000-0000-4000-8000-000000000010',null,'Contracted service',true,'active') id;
create temporary table selected_contract as select public.save_maintenance_contract('ac000000-0000-4000-8000-000000000010',null,'ac000000-0000-4000-8000-000000000401','Maintenance contract',current_date-1,current_date+30,100,'active','') id;
create temporary table contract_order as select * from public.create_maintenance_work_order(null,'ac000000-0000-4000-8000-000000000011',null,'Contract required','medium','ac000000-0000-4000-8000-000000000301','ac000000-0000-4000-8000-000000000401',null,'inspection',(select id from required_contract_type),null,0,null);
grant select on required_contract_type,selected_contract,contract_order to authenticated;
set local role authenticated;
select pg_temp.expect_failure(format('select public.transition_maintenance_work_order(%L,%L)',id,'start'),'Este serviço exige contrato') from contract_order;
select public.update_maintenance_order_details(id,'inspection',(select id from required_contract_type),(select id from selected_contract),'ac000000-0000-4000-8000-000000000401',null,0,0,null) from contract_order;
select public.transition_maintenance_work_order(id,'start') from contract_order;
select pg_temp.expect_failure(format('select public.save_maintenance_contract(%L,%L,%L,%L,current_date,current_date+30,500,%L,%L)','ac000000-0000-4000-8000-000000000010',id,'ac000000-0000-4000-8000-000000000401','Changed contract','active',''),'Contrato utilizado') from selected_contract;
reset role;

rollback;
