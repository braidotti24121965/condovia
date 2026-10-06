begin;
select plan(10);

select ok(exists (select 1 from information_schema.columns where table_schema='public' and table_name='reservations' and column_name='reservation_mode'), 'reservation snapshot column exists');
select ok(exists (select 1 from pg_constraint where conrelid='public.reservations'::regclass and pg_get_constraintdef(oid) like '%reservation_mode%day%time_slot%'), 'reservation snapshot accepts day and time_slot');
select ok(to_regclass('public.reservation_status_history') is not null, 'reservation history remains available');
select ok(exists (select 1 from pg_trigger where tgrelid='public.reservations'::regclass and tgname='reservations_creation_history'), 'creation audit trigger exists');
select ok(exists (select 1 from pg_proc where proname='manage_reservation'), 'approval management remains available');
select ok(exists (select 1 from pg_constraint where conrelid='public.reservations'::regclass and pg_get_constraintdef(oid) like '%pending%approved%rejected%cancelled%'), 'transactional statuses remain constrained');
select ok((select relrowsecurity from pg_class where oid='public.reservations'::regclass), 'reservations RLS remains enabled');
select ok((select relrowsecurity from pg_class where oid='public.reservation_status_history'::regclass), 'history RLS remains enabled');
select ok(not exists (select 1 from pg_constraint where conrelid='public.reservations'::regclass and contype='c' and pg_get_constraintdef(oid) ilike '%expired%'), 'expiration status is not invented');
select ok(not exists (select 1 from pg_class where relname like '%reservation_expir%'), 'expiration job/table is not invented');

select * from finish();
rollback;
