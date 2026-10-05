-- 020_access_events.sql
-- Access Events (Factual and Append-Oriented)

create table public.access_events (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  access_point_id uuid not null references public.access_points(id) on delete restrict,
  visitor_id uuid references public.visitors(id) on delete restrict,
  service_provider_id uuid references public.service_providers(id) on delete restrict,
  authorization_id uuid not null references public.access_authorizations(id) on delete restrict,
  access_request_id uuid references public.access_requests(id) on delete set null,
  unit_id uuid not null references public.units(id) on delete restrict,
  event_type text not null check (event_type in ('entry', 'exit')),
  occurred_at timestamptz not null default now(),
  recorded_by_user_account_id uuid not null references public.user_accounts(id) on delete restrict,
  notes text,
  sequence_number bigint generated always as identity,
  created_at timestamptz not null default now(),
  constraint access_events_target_xor check (
    (visitor_id is not null and service_provider_id is null) or
    (visitor_id is null and service_provider_id is not null)
  )
);

create index access_events_seq_idx on public.access_events(sequence_number desc);

create index access_events_condo_idx on public.access_events(condominium_id, occurred_at desc);
create index access_events_visitor_idx on public.access_events(visitor_id, occurred_at desc) where visitor_id is not null;
create index access_events_provider_idx on public.access_events(service_provider_id, occurred_at desc) where service_provider_id is not null;
create index access_events_unit_idx on public.access_events(unit_id, occurred_at desc);

-- Disallow updates and deletes on historical access events
create or replace function public.prevent_access_event_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Access events are factual historical records and cannot be modified or deleted';
end;
$$;

create trigger access_events_immutable_guard
before update or delete on public.access_events
for each row execute function public.prevent_access_event_mutation();
