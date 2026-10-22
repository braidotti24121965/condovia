create extension if not exists pgtap with schema extensions;
begin;
select plan(6);

select has_function('public', 'register_access_exit', array['uuid', 'uuid', 'uuid', 'text'], 'exit by authorization overload exists');
select has_function('public', 'close_expired_visitor_pass_entries', array[]::text[], 'expiry closure function exists');
select ok(to_regprocedure('cron.schedule(text,text,text)') is not null, 'pg_cron schedule API is available');
select ok($$Saída automática por vencimento do passe$$ = 'Saída automática por vencimento do passe', 'automatic exit note is exact');
select ok(pg_get_functiondef('public.close_expired_visitor_pass_entries()'::regprocedure) like '%valid_until%', 'closure uses pass validity end');
select ok(pg_get_functiondef('public.close_expired_visitor_pass_entries()'::regprocedure) like '%event_type = ''entry''%', 'closure selects open entries');

select * from finish();
rollback;
