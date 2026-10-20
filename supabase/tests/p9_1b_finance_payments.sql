begin;

select plan(37);
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

insert into public.clients (id, legal_name)
values ('b1b10000-0000-4000-8000-000000000001', 'P9.1b Test Client');
insert into public.condominiums (id, client_id, name, timezone)
values
  ('b1b11000-0000-4000-8000-000000000001', 'b1b10000-0000-4000-8000-000000000001', 'P9.1b Alpha', 'America/Sao_Paulo'),
  ('b1b11000-0000-4000-8000-000000000002', 'b1b10000-0000-4000-8000-000000000001', 'P9.1b Beta', 'America/Sao_Paulo');
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('b1b12000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'p9-1b-manager@example.test', '', now(), now(), now());
insert into public.people (id, full_name, status)
values ('b1b13000-0000-4000-8000-000000000001', 'P9.1b Manager', 'active');
insert into public.user_accounts (id, auth_user_id, person_id, status)
values ('b1b14000-0000-4000-8000-000000000001', 'b1b12000-0000-4000-8000-000000000001', 'b1b13000-0000-4000-8000-000000000001', 'active');
insert into public.condominium_memberships (id, condominium_id, user_account_id, status)
values ('b1b15000-0000-4000-8000-000000000001', 'b1b11000-0000-4000-8000-000000000001', 'b1b14000-0000-4000-8000-000000000001', 'active');
insert into public.role_assignments (user_account_id, role_id, condominium_id)
select 'b1b14000-0000-4000-8000-000000000001', id, 'b1b11000-0000-4000-8000-000000000001'
from public.roles where code = 'condominium.manager';
insert into public.condominium_finance_categories (id, condominium_id, name, kind)
values ('b1b16000-0000-4000-8000-000000000001', 'b1b11000-0000-4000-8000-000000000001', 'P9.1b Teste', 'payable');
insert into public.condominium_payables (id, condominium_id, category_id, description, competence_date, due_date, amount_cents, status, created_by)
values
  ('b1b17000-0000-4000-8000-000000000001', 'b1b11000-0000-4000-8000-000000000001', 'b1b16000-0000-4000-8000-000000000001', 'Conta total', current_date, current_date, 10000, 'open', 'b1b14000-0000-4000-8000-000000000001'),
  ('b1b17000-0000-4000-8000-000000000002', 'b1b11000-0000-4000-8000-000000000001', 'b1b16000-0000-4000-8000-000000000001', 'Conta parcial', current_date, current_date, 10000, 'open', 'b1b14000-0000-4000-8000-000000000001'),
  ('b1b17000-0000-4000-8000-000000000003', 'b1b11000-0000-4000-8000-000000000001', 'b1b16000-0000-4000-8000-000000000001', 'Conta cancelar', current_date, current_date, 10000, 'open', 'b1b14000-0000-4000-8000-000000000001'),
  ('b1b17000-0000-4000-8000-000000000004', 'b1b11000-0000-4000-8000-000000000002', null, 'Conta outro condominio', current_date, current_date, 10000, 'open', 'b1b14000-0000-4000-8000-000000000001');
insert into public.condominium_payables (id, condominium_id, category_id, description, competence_date, due_date, amount_cents, status, created_by, paid_at, cancelled_at, cancelled_by, cancellation_reason)
values ('b1b17000-0000-4000-8000-000000000005', 'b1b11000-0000-4000-8000-000000000001', 'b1b16000-0000-4000-8000-000000000001', 'Conta normalizada', current_date, current_date, 10000, 'paid', 'b1b14000-0000-4000-8000-000000000001', now(), now(), 'b1b14000-0000-4000-8000-000000000001', 'ignorar');
insert into public.condominium_receivables (id, condominium_id, category_id, description, competence_date, due_date, amount_cents, status, created_by, received_at, cancelled_at, cancelled_by, cancellation_reason)
values ('b1b18000-0000-4000-8000-000000000001', 'b1b11000-0000-4000-8000-000000000001', 'b1b16000-0000-4000-8000-000000000001', 'Receita normalizada', current_date, current_date, 10000, 'received', 'b1b14000-0000-4000-8000-000000000001', now(), now(), 'b1b14000-0000-4000-8000-000000000001', 'ignorar');

select is((select status from public.condominium_payables where id = 'b1b17000-0000-4000-8000-000000000005'), 'open', 'direct payable insert forces open status');
select is((select status from public.condominium_receivables where id = 'b1b18000-0000-4000-8000-000000000001'), 'open', 'direct receivable insert forces open status');
select ok((select paid_at is null and cancelled_at is null and cancelled_by is null and cancellation_reason is null from public.condominium_payables where id = 'b1b17000-0000-4000-8000-000000000005'), 'payable insert clears lifecycle fields');
select ok((select received_at is null and cancelled_at is null and cancelled_by is null and cancellation_reason is null from public.condominium_receivables where id = 'b1b18000-0000-4000-8000-000000000001'), 'receivable insert clears lifecycle fields');

grant select on public.condominium_payables, public.condominium_payments, public.condominium_finance_events to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1b12000-0000-4000-8000-000000000001', true);
select ok(public.has_permission('finance.payables.manage', 'b1b11000-0000-4000-8000-000000000001'), 'manager has payable manage permission');
select throws_ok($$insert into public.condominium_payments (condominium_id, payable_id, amount_cents, paid_on, method) values ('b1b11000-0000-4000-8000-000000000001', 'b1b17000-0000-4000-8000-000000000001', 100, current_date, 'pix')$$, '42501', null, 'direct payment insert is rejected');
select throws_ok($$update public.condominium_payables set status = 'paid' where id = 'b1b17000-0000-4000-8000-000000000001'$$, '42501', null, 'direct status update is rejected');

select (public.register_finance_payment('payable', 'b1b17000-0000-4000-8000-000000000001', 10000, current_date, 'pix', ' pagamento total ')).id is not null;
set local role postgres;
select is((select status from public.condominium_payables where id = 'b1b17000-0000-4000-8000-000000000001'), 'paid', 'total payment marks payable paid');
select is((select notes from public.condominium_payments where payable_id = 'b1b17000-0000-4000-8000-000000000001'), 'pagamento total', 'payment notes are trimmed');
set local role authenticated;
select throws_ok($$update public.condominium_payables set description = 'Tentativa paga' where id = 'b1b17000-0000-4000-8000-000000000001'$$, '23514', 'Conta encerrada não pode ser editada', 'paid payable cannot be edited');
select throws_ok($$update public.condominium_payments set notes = 'direct update' where payable_id = 'b1b17000-0000-4000-8000-000000000001'$$, '42501', null, 'direct payment update is rejected');
select (public.register_finance_payment('payable', 'b1b17000-0000-4000-8000-000000000002', 4000, current_date, 'boleto', null)).id is not null;
set local role postgres;
select is((select status from public.condominium_payables where id = 'b1b17000-0000-4000-8000-000000000002'), 'partially_paid', 'partial payment marks payable partially paid');
set local role authenticated;
select throws_ok($$update public.condominium_payables set amount_cents = 9000 where id = 'b1b17000-0000-4000-8000-000000000002'$$, '23514', 'Conta com pagamentos não pode ser editada', 'amount edit is rejected with active payment');
select throws_ok($$select public.cancel_finance_entry('payable', 'b1b17000-0000-4000-8000-000000000002', 'pagamento ativo')$$, '23514', 'Não é possível cancelar uma conta com pagamentos ativos', 'cancellation with active payment is rejected');
select throws_ok($$select public.register_finance_payment('payable', 'b1b17000-0000-4000-8000-000000000002', 7000, current_date, 'pix', null)$$, '22003', 'Pagamento excede o saldo da conta', 'overpayment is rejected');
select (public.reverse_finance_payment((select id from public.condominium_payments where payable_id = 'b1b17000-0000-4000-8000-000000000002'), '  erro de teste  ')).id is not null;
set local role postgres;
select is((select status from public.condominium_payables where id = 'b1b17000-0000-4000-8000-000000000002'), 'open', 'reversal recalculates payable status');
select is((select payload->>'reason' from public.condominium_finance_events where event_type = 'payment_reversed' and entity_type = 'payment' limit 1), 'erro de teste', 'reversal event reason is trimmed');
set local role authenticated;
select lives_ok($$update public.condominium_payables set description = 'Conta aberta editada' where id = 'b1b17000-0000-4000-8000-000000000003'$$, 'open payable can be edited');
select ok(public.cancel_finance_entry('payable', 'b1b17000-0000-4000-8000-000000000003', '  sem pagamento  '), 'cancellation without payment succeeds');
set local role postgres;
select is((select status from public.condominium_payables where id = 'b1b17000-0000-4000-8000-000000000003'), 'cancelled', 'cancellation stores cancelled status');
select is((select cancellation_reason from public.condominium_payables where id = 'b1b17000-0000-4000-8000-000000000003'), 'sem pagamento', 'cancellation reason is trimmed');
set local role authenticated;
select throws_ok($$update public.condominium_payables set notes = 'Tentativa cancelada' where id = 'b1b17000-0000-4000-8000-000000000003'$$, '23514', 'Conta encerrada não pode ser editada', 'cancelled payable cannot be edited');
select throws_ok($$select public.register_finance_payment('payable', 'b1b17000-0000-4000-8000-000000000004', 1000, current_date, 'pix', null)$$, '42501', 'Conta a pagar não autorizada', 'cross-condominium payment is rejected');

select * from finish();
rollback;
