begin;

select plan(14);
select has_table('public', 'condominium_payments', 'payments table exists');
select has_table('public', 'condominium_finance_events', 'finance events table exists');
select has_column('public', 'condominium_payables', 'cancelled_at', 'payables have cancellation timestamp');
select has_column('public', 'condominium_payables', 'cancelled_by', 'payables have cancellation actor');
select has_column('public', 'condominium_payables', 'cancellation_reason', 'payables have cancellation reason');
select has_column('public', 'condominium_receivables', 'cancelled_at', 'receivables have cancellation timestamp');
select has_column('public', 'condominium_receivables', 'cancelled_by', 'receivables have cancellation actor');
select has_column('public', 'condominium_receivables', 'cancellation_reason', 'receivables have cancellation reason');
select has_function('public', 'register_finance_payment', array['text','uuid','bigint','date','text','text'], 'payment RPC exists');
select has_function('public', 'reverse_finance_payment', array['uuid','text'], 'reversal RPC exists');
select has_function('public', 'cancel_finance_entry', array['text','uuid','text'], 'structured cancellation RPC exists');
select ok(not has_table_privilege('authenticated', 'public.condominium_payments', 'DELETE'), 'authenticated cannot delete payments');
select ok(not has_table_privilege('authenticated', 'public.condominium_finance_events', 'DELETE'), 'authenticated cannot delete finance events');
select ok((select count(*) from pg_indexes where schemaname='public' and tablename='condominium_payments') >= 3, 'payment lookup indexes exist');
select * from finish();

rollback;
