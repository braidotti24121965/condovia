begin;
select plan(17);

select has_table('public', 'reservation_resource_blocks', 'resource blocks table exists');
select has_column('public', 'reservation_resource_blocks', 'condominium_id', 'block is tenant scoped');
select has_column('public', 'reservation_resource_blocks', 'resource_id', 'block belongs to resource');
select has_column('public', 'reservation_resource_blocks', 'start_at', 'block has start instant');
select has_column('public', 'reservation_resource_blocks', 'end_at', 'block has end instant');
select has_column('public', 'reservation_resource_blocks', 'reason', 'block has mandatory reason');
select has_column('public', 'reservation_resource_blocks', 'created_by_user_account_id', 'block records creator');
select has_column('public', 'reservation_resource_blocks', 'status', 'block supports cancellation');
select is((select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'reservation_resource_blocks'), 3, 'block RLS has read, insert and update policies');
select is((select relrowsecurity from pg_class where oid = 'public.reservation_resource_blocks'::regclass), true, 'block RLS is enabled');
select is((select has_table_privilege('authenticated', 'public.reservation_resource_blocks', 'select')), true, 'authenticated can use RLS-controlled select');
select is((select has_table_privilege('authenticated', 'public.reservation_resource_blocks', 'insert')), true, 'authenticated can use RLS-controlled insert');
select is((select has_table_privilege('authenticated', 'public.reservation_resource_blocks', 'update')), true, 'authenticated can use RLS-controlled update');
select is((select has_table_privilege('authenticated', 'public.reservation_resource_blocks', 'delete')), false, 'physical delete is not granted');
select has_function('public', 'prevent_reservation_resource_block_conflict', 'block conflict trigger function exists');
select is((select count(*)::int from pg_trigger where tgname = 'reservation_resource_blocks_guard'), 1, 'block conflict trigger is installed');
select has_function('public', 'get_reservation_resource_blocks', 'sanitized availability function exists');

select * from finish();
rollback;
