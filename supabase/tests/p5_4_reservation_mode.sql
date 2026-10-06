begin;
select plan(8);

select has_column('public', 'reservable_resources', 'reservation_mode', 'reservation_mode column exists');
select is(
  (select data_type from information_schema.columns where table_schema = 'public' and table_name = 'reservable_resources' and column_name = 'reservation_mode'),
  'text',
  'reservation_mode is text'
);
select is(
  (select is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'reservable_resources' and column_name = 'reservation_mode'),
  'NO',
  'reservation_mode is required'
);
select is(
  (select column_default from information_schema.columns where table_schema = 'public' and table_name = 'reservable_resources' and column_name = 'reservation_mode'),
  '''time_slot''::text',
  'default reservation mode is time_slot'
);
select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'reservable_resources'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) like '%reservation_mode%day%time_slot%'
  ),
  'reservation_mode permits only day and time_slot'
);
select is(
  (select count(*)::int from public.reservable_resources where reservation_mode is null),
  0,
  'existing resources have a non-null reservation mode'
);
select ok(to_regclass('public.reservable_resources') is not null, 'reservable resources table remains available');
select ok(to_regclass('public.reservations') is not null, 'reservations table remains available');

select * from finish();
rollback;
