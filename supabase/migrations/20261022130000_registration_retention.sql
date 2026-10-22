-- 20261022130000_registration_retention.sql
-- Retention of identity data in the gatehouse: 90 days after the last authorization ends.
-- Purged: photo, document type and number, and vehicle plates. The name stays so access history
-- remains readable. Photo files are removed from storage by the application job that reads
-- gatehouse_photo_purge_queue (storage objects cannot be safely deleted with SQL).

alter table public.visitors
  add column if not exists retention_purged_at timestamptz;

alter table public.service_providers
  add column if not exists retention_purged_at timestamptz;

-- Purged rows lose their document and photo on purpose, so the mandatory-data checks must accept them.
alter table public.visitors
  drop constraint if exists visitors_document_required,
  add constraint visitors_document_required
    check (retention_purged_at is not null
      or (document_type is not null and document_number is not null and char_length(trim(document_number)) >= 4)) not valid,
  drop constraint if exists visitors_photo_required,
  add constraint visitors_photo_required
    check (retention_purged_at is not null or photo_path is not null) not valid;

alter table public.service_providers
  drop constraint if exists providers_document_required,
  add constraint providers_document_required
    check (retention_purged_at is not null
      or (document_type is not null and document_number is not null and char_length(trim(document_number)) >= 4)) not valid,
  drop constraint if exists providers_photo_required,
  add constraint providers_photo_required
    check (retention_purged_at is not null or photo_path is not null) not valid;

-- Photo files waiting to be removed from storage. Only the server (service role) reads and updates it.
create table if not exists public.gatehouse_photo_purge_queue (
  id uuid primary key default gen_random_uuid(),
  photo_path text not null unique,
  queued_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.gatehouse_photo_purge_queue enable row level security;

create or replace function public.purge_expired_person_registrations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
begin
  with expired_visitors as (
    select v.id
    from public.visitors v
    where v.retention_purged_at is null
      and (v.photo_path is not null or v.document_number is not null)
      and coalesce(
        (select max(a.valid_until) from public.access_authorizations a where a.visitor_id = v.id),
        v.created_at
      ) < now() - interval '90 days'
      and not exists (
        select 1 from public.access_authorizations a
        where a.visitor_id = v.id and a.valid_until >= now() - interval '90 days' and a.status in ('approved', 'pending')
      )
  ),
  queued as (
    insert into public.gatehouse_photo_purge_queue (photo_path)
    select v.photo_path from public.visitors v join expired_visitors e on e.id = v.id where v.photo_path is not null
    on conflict (photo_path) do nothing
    returning 1
  ),
  cleared_vehicles as (
    delete from public.person_vehicles pv using expired_visitors e where pv.visitor_id = e.id
    returning 1
  )
  update public.visitors v
     set photo_path = null, document_type = null, document_number = null, retention_purged_at = now()
   where v.id in (select id from expired_visitors);
  get diagnostics v_count = row_count;

  with expired_providers as (
    select sp.id
    from public.service_providers sp
    where sp.retention_purged_at is null
      and (sp.photo_path is not null or sp.document_number is not null)
      and coalesce(
        (select max(a.valid_until) from public.access_authorizations a where a.service_provider_id = sp.id),
        sp.created_at
      ) < now() - interval '90 days'
      and not exists (
        select 1 from public.access_authorizations a
        where a.service_provider_id = sp.id and a.valid_until >= now() - interval '90 days' and a.status in ('approved', 'pending')
      )
  ),
  queued_providers as (
    insert into public.gatehouse_photo_purge_queue (photo_path)
    select sp.photo_path from public.service_providers sp join expired_providers e on e.id = sp.id where sp.photo_path is not null
    on conflict (photo_path) do nothing
    returning 1
  ),
  cleared_provider_vehicles as (
    delete from public.person_vehicles pv using expired_providers e where pv.service_provider_id = e.id
    returning 1
  )
  update public.service_providers sp
     set photo_path = null, document_type = null, document_number = null, retention_purged_at = now()
   where sp.id in (select id from expired_providers);

  return v_count;
end;
$$;

revoke all on function public.purge_expired_person_registrations() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'condovia-purge-person-registrations';
    perform cron.schedule('condovia-purge-person-registrations', '0 6 * * *', 'select public.purge_expired_person_registrations()');
  end if;
end
$$;
