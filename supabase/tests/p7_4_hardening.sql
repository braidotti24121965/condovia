begin;

select plan(8);

select has_function(
  'public',
  'confirm_import_batch',
  'confirm_import_batch exists in the public schema'
);

select ok(
  (
    select p.prosecdef
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'confirm_import_batch'
    limit 1
  ),
  'confirm_import_batch is SECURITY DEFINER'
);

select ok(
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'confirm_import_batch'
      and 'search_path=""' = any(coalesce(p.proconfig, array[]::text[]))
  ),
  'confirm_import_batch pins an empty search_path'
);

select ok(
  (
    select p.prosrc
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'confirm_import_batch'
    limit 1
  ) ~ 'public[.]import_batches'
  and (
    select p.prosrc
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'confirm_import_batch'
    limit 1
  ) ~ 'public[.]import_batch_rows',
  'confirm_import_batch uses qualified import table references'
);

select ok(
  not has_function_privilege('anon', 'public.confirm_import_batch(uuid)', 'EXECUTE'),
  'anon cannot execute confirm_import_batch'
);

select ok(
  has_function_privilege('authenticated', 'public.confirm_import_batch(uuid)', 'EXECUTE'),
  'authenticated can execute confirm_import_batch'
);

select ok(
  not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.proname like '%import%'
      and not ('search_path=""' = any(coalesce(p.proconfig, array[]::text[])))
  ),
  'MVP import SECURITY DEFINER functions pin an empty search_path'
);

select ok(
  not has_function_privilege('anon', 'public.confirm_import_batch(uuid)', 'EXECUTE'),
  'critical import RPC inventory has no anon EXECUTE grant'
);

select * from finish();
rollback;
