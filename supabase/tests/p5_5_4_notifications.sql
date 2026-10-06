begin;
select plan(12);

select ok(to_regclass('public.notifications') is not null, 'generic notifications table exists');
select ok(coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.notifications')), false), 'notifications RLS is enabled');
select ok(exists (select 1 from pg_policies where tablename='notifications' and policyname='notifications_read_own'), 'notifications read policy is recipient scoped');
select ok(exists (select 1 from pg_policies where tablename='notifications' and policyname='notifications_mark_own'), 'notifications update policy is recipient scoped');
select ok(to_regclass('public.notifications') is not null and has_column_privilege('authenticated', 'public.notifications', 'read_at', 'UPDATE'), 'authenticated can update notification read state');
select ok(to_regclass('public.notifications') is null or not has_table_privilege('authenticated', 'public.notifications', 'INSERT'), 'authenticated cannot insert arbitrary notifications');
select ok(exists (select 1 from pg_constraint where conrelid=to_regclass('public.notifications') and contype='u' and pg_get_constraintdef(oid) like '%recipient_user_account_id%notification_type%entity_id%'), 'notification event idempotency constraint exists');
select ok(exists (select 1 from pg_trigger where tgrelid='public.reservations'::regclass and tgname='reservations_requested_notification'), 'reservation request notification trigger exists');
select ok(exists (select 1 from pg_trigger where tgrelid=to_regclass('public.reservation_status_history') and tgname='reservation_status_notification'), 'reservation status notification trigger exists');
select ok(exists (select 1 from pg_proc where proname='emit_reservation_requested_notification'), 'request notification function exists');
select ok(exists (select 1 from pg_proc where proname='emit_reservation_status_notification'), 'status notification function exists');
select ok(not exists (select 1 from pg_class where relname like '%reservation_notification%'), 'no reservation-specific notification table exists');

select * from finish();
rollback;
