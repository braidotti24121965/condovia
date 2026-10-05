-- 019_access_authorizations.sql
-- Access Requests and Access Authorizations

create table public.access_requests (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  unit_id uuid not null references public.units(id) on delete restrict,
  visitor_id uuid references public.visitors(id) on delete restrict,
  service_provider_id uuid references public.service_providers(id) on delete restrict,
  requested_by_user_account_id uuid not null references public.user_accounts(id) on delete restrict,
  requested_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied', 'cancelled')),
  decided_by_person_id uuid references public.people(id) on delete set null,
  decided_by_user_account_id uuid references public.user_accounts(id) on delete set null,
  decided_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint access_requests_target_xor check (
    (visitor_id is not null and service_provider_id is null) or
    (visitor_id is null and service_provider_id is not null)
  )
);

create index access_requests_condo_idx on public.access_requests(condominium_id);
create index access_requests_unit_idx on public.access_requests(unit_id, status);
create index access_requests_pending_idx on public.access_requests(condominium_id, status) where status = 'pending';

create table public.access_authorizations (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  unit_id uuid not null references public.units(id) on delete restrict,
  visitor_id uuid references public.visitors(id) on delete restrict,
  service_provider_id uuid references public.service_providers(id) on delete restrict,
  authorized_by_person_id uuid not null references public.people(id) on delete restrict,
  authorized_by_user_account_id uuid references public.user_accounts(id) on delete set null,
  source_request_id uuid references public.access_requests(id) on delete set null,
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  status text not null default 'approved' check (status in ('pending', 'approved', 'denied', 'cancelled')),
  notes text,
  approved_at timestamptz,
  denied_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by uuid references public.user_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint access_authorizations_target_xor check (
    (visitor_id is not null and service_provider_id is null) or
    (visitor_id is null and service_provider_id is not null)
  ),
  constraint access_authorizations_period_check check (valid_from < valid_until)
);

create index access_authorizations_condo_idx on public.access_authorizations(condominium_id);
create index access_authorizations_unit_idx on public.access_authorizations(unit_id, status);
create index access_authorizations_validity_idx on public.access_authorizations(condominium_id, status, valid_from, valid_until);
create index access_authorizations_visitor_idx on public.access_authorizations(visitor_id) where visitor_id is not null;
create index access_authorizations_provider_idx on public.access_authorizations(service_provider_id) where service_provider_id is not null;
