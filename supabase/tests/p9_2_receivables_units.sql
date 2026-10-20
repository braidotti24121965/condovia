begin;

select plan(14);
select has_column('public', 'condominium_receivables', 'unit_id', 'receivables have optional unit');
select has_column('public', 'condominium_receivables', 'payer_person_id', 'receivables have optional payer');
select has_function('public', 'validate_receivable_unit_payer', array[]::text[], 'receivable unit/payer trigger function exists');
select has_function('public', 'get_unit_financial_responsible', array['uuid','date'], 'responsible lookup RPC exists');
select ok((select count(*) from pg_indexes where schemaname = 'public' and tablename = 'condominium_receivables' and indexname like '%unit%') > 0, 'unit lookup index exists');
select ok((select count(*) from pg_indexes where schemaname = 'public' and tablename = 'condominium_receivables' and indexname like '%payer%') > 0, 'payer lookup index exists');
select has_trigger('public', 'condominium_receivables', 'condominium_receivables_unit_payer_guard', 'unit/payer validation trigger exists');
select ok(has_column_privilege('authenticated', 'public.condominium_receivables', 'unit_id', 'UPDATE') and has_column_privilege('authenticated', 'public.condominium_receivables', 'payer_person_id', 'UPDATE'), 'authenticated can update permitted receivable columns');
select ok(pg_get_functiondef('public.validate_receivable_unit_payer()'::regprocedure) is not null, 'validation function is installed');
select ok(pg_get_functiondef('public.get_unit_financial_responsible(uuid,date)'::regprocedure) like '%finance.receivables.read%', 'responsible lookup checks permission');
select ok(pg_get_functiondef('public.prevent_finance_paid_edit()'::regprocedure) like '%Conta com pagamentos não pode ser editada%', 'active payment edit guard remains');
select ok(pg_get_functiondef('public.prevent_finance_paid_edit()'::regprocedure) like '%Conta encerrada não pode ser editada%', 'closed entry edit guard remains');
select ok((select pg_get_functiondef('public.validate_receivable_unit_payer()'::regprocedure) like '%unit_financial_responsibilities%' and pg_get_functiondef('public.validate_receivable_unit_payer()'::regprocedure) like '%unit_ownerships%'), 'validation checks financial responsibility and ownership');
select ok((select pg_get_functiondef('public.validate_receivable_unit_payer()'::regprocedure) like '%unidade não pertence%' and pg_get_functiondef('public.validate_receivable_unit_payer()'::regprocedure) like '%pagador não está vinculado%'), 'validation has clear rejection messages');

select * from finish();
rollback;
