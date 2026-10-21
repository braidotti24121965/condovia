-- Register pass exits by authorization and close open entries after pass expiry.

create or replace function public.register_access_exit(
  p_condominium_id uuid,
  p_authorization_id uuid,
  p_access_point_id uuid,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target record;
begin
  select visitor_id, service_provider_id into v_target
  from public.access_authorizations
  where id = p_authorization_id and condominium_id = p_condominium_id;
  if not found then raise exception 'Autorização não encontrada neste condomínio'; end if;
  return public.register_access_exit(
    p_condominium_id, v_target.visitor_id, v_target.service_provider_id,
    p_access_point_id, p_notes
  );
end;
$$;

revoke all on function public.register_access_exit(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.register_access_exit(uuid, uuid, uuid, text) to authenticated;

create or replace function public.close_expired_visitor_pass_entries()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  with open_entries as (
    select distinct on (ae.authorization_id)
      ae.condominium_id, ae.access_point_id, ae.visitor_id, ae.service_provider_id,
      ae.authorization_id, ae.unit_id, aa.valid_until
    from public.access_events ae
    join public.access_authorizations aa on aa.id = ae.authorization_id
    where ae.event_type = 'entry'
      and aa.valid_until < now()
      and not exists (
        select 1 from public.access_events later
        where later.condominium_id = ae.condominium_id
          and later.authorization_id = ae.authorization_id
          and later.event_type = 'exit'
          and (later.occurred_at, later.sequence_number) > (ae.occurred_at, ae.sequence_number)
      )
    order by ae.authorization_id, ae.occurred_at desc, ae.sequence_number desc
  )
  insert into public.access_events (
    condominium_id, access_point_id, visitor_id, service_provider_id,
    authorization_id, unit_id, event_type, occurred_at, recorded_by_user_account_id, notes
  )
  select condominium_id, access_point_id, visitor_id, service_provider_id,
    authorization_id, unit_id, 'exit', valid_until, null,
    'Saída automática por vencimento do passe'
  from open_entries;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.close_expired_visitor_pass_entries() from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron')
     and exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    execute 'create extension pg_cron';
  end if;
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'condovia-close-expired-visitor-passes';
    perform cron.schedule('condovia-close-expired-visitor-passes', '*/10 * * * *', 'select public.close_expired_visitor_pass_entries()');
  end if;
end
$$;
