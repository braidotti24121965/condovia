begin;
select plan(9);

select ok(
  (select pg_get_functiondef(p.oid) like '%pg_advisory_xact_lock%'
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'prevent_reservation_buffer_conflict'),
  'DAY conflict keeps the transaction advisory lock'
);
select ok(
  (select pg_get_functiondef(p.oid) like '%reservation_mode%'
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'prevent_reservation_buffer_conflict'),
  'conflict function reads reservation mode'
);
select ok(
  (select pg_get_functiondef(p.oid) like '%at time zone%'
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'prevent_reservation_buffer_conflict'),
  'DAY conflict compares condominium civil dates'
);
select ok(
  (select pg_get_functiondef(p.oid) like '%resource_mode = ''day''%'
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'prevent_reservation_buffer_conflict'),
  'DAY has a dedicated conflict branch'
);
select ok(
  (select pg_get_functiondef(p.oid) like '%and r.status in (''pending'', ''approved'')%'
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'prevent_reservation_buffer_conflict'),
  'only pending and approved reservations block DAY'
);
select ok(
  (select pg_get_functiondef(p.oid) like '%return new;%'
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'prevent_reservation_buffer_conflict'),
  'DAY branch returns before the time-slot buffer check'
);
select ok(
  (select pg_get_functiondef(p.oid) like '%make_interval(mins => resource_buffer)%'
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'prevent_reservation_buffer_conflict'),
  'TIME_SLOT keeps buffer protection'
);
select ok(
  (select pg_get_functiondef(p.oid) like '%r.condominium_id = new.condominium_id%'
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'prevent_reservation_buffer_conflict'),
  'conflict remains tenant scoped'
);
select has_function('public', 'prevent_reservation_buffer_conflict', 'reservation conflict trigger function remains available');

select * from finish();
rollback;
