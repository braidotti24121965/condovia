-- Impressão digital do schema da Manutenção (P8). Somente leitura.
-- Saída: uma linha por objeto: tipo | nome | md5 da definição normalizada (sem espaços).
with fx as (
  select 'function' as kind, n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' as name,
         md5(regexp_replace(pg_get_functiondef(p.oid), '\s+', '', 'g')) as fp
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where p.prokind = 'f' and (n.nspname = 'maintenance_private' or (n.nspname = 'public' and p.proname ~ 'maint'))
), pol as (
  select 'policy', schemaname||'.'||tablename||'.'||policyname,
         md5(regexp_replace(coalesce(cmd,'')||coalesce(array_to_string(roles,','),'')||coalesce(qual,'')||coalesce(with_check,''), '\s+', '', 'g'))
  from pg_policies where (schemaname = 'public' and tablename ~ 'maint') or (schemaname='storage' and policyname ~ 'maint')
), col as (
  select 'columns', table_schema||'.'||table_name,
         md5(string_agg(column_name||':'||data_type||':'||is_nullable||':'||coalesce(regexp_replace(column_default,'\s+','','g'),''), ',' order by column_name))
  from information_schema.columns where table_schema = 'public' and table_name ~ 'maint' group by 1,2
), con as (
  select 'constraints', conrelid::regclass::text,
         md5(string_agg(conname||':'||regexp_replace(pg_get_constraintdef(oid),'\s+','','g'), ',' order by conname))
  from pg_constraint where conrelid::regclass::text ~ '^(public\.)?maint' group by 1,2
), idx as (
  select 'indexes', tablename, md5(string_agg(indexname||':'||regexp_replace(indexdef,'\s+','','g'), ',' order by indexname))
  from pg_indexes where schemaname='public' and tablename ~ 'maint' group by 1,2
), grt as (
  select 'grants', table_name, md5(string_agg(grantee||':'||privilege_type, ',' order by grantee, privilege_type))
  from information_schema.role_table_grants where table_schema='public' and table_name ~ 'maint' and grantee in ('anon','authenticated','service_role') group by 1,2
)
select * from fx union all select * from pol union all select * from col union all select * from con union all select * from idx union all select * from grt
order by 1,2;
