-- 20261022100000_registration_photo_vehicle.sql
-- Visitor and provider registration: photo, identity document, vehicle plate, recurring flag.
-- Rows that already exist are kept (NOT VALID checks): only new or updated rows must comply.

-- 1. Photo and recurring flag on visitors and providers
alter table public.visitors
  add column if not exists photo_path text,
  add column if not exists is_recurring boolean not null default false;

alter table public.service_providers
  add column if not exists photo_path text,
  add column if not exists is_recurring boolean not null default false;

-- 2. Identity document and photo required for new registrations (CPF, RG, CNH or passport)
alter table public.visitors
  drop constraint if exists visitors_document_required,
  add constraint visitors_document_required
    check (document_type is not null and document_number is not null and char_length(trim(document_number)) >= 4) not valid,
  drop constraint if exists visitors_photo_required,
  add constraint visitors_photo_required
    check (photo_path is not null) not valid;

alter table public.service_providers
  drop constraint if exists providers_document_required,
  add constraint providers_document_required
    check (document_type is not null and document_number is not null and char_length(trim(document_number)) >= 4) not valid,
  drop constraint if exists providers_photo_required,
  add constraint providers_photo_required
    check (photo_path is not null) not valid;

-- 3. Vehicles, linked to exactly one visitor or one service provider
create table if not exists public.person_vehicles (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  visitor_id uuid references public.visitors(id) on delete restrict,
  service_provider_id uuid references public.service_providers(id) on delete restrict,
  plate text not null,
  model text,
  color text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  created_by uuid references public.user_accounts(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.user_accounts(id) on delete set null,
  constraint person_vehicles_one_owner check (
    (visitor_id is not null and service_provider_id is null)
    or (visitor_id is null and service_provider_id is not null)
  ),
  -- Mercosul (ABC1D23) or legacy (ABC1234) plate, stored without the hyphen and in uppercase.
  constraint person_vehicles_plate_format check (plate ~ '^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$')
);

create index if not exists person_vehicles_condominium_idx on public.person_vehicles(condominium_id);
create index if not exists person_vehicles_visitor_idx on public.person_vehicles(visitor_id) where visitor_id is not null;
create index if not exists person_vehicles_provider_idx on public.person_vehicles(service_provider_id) where service_provider_id is not null;
create unique index if not exists person_vehicles_active_plate_idx
  on public.person_vehicles(condominium_id, plate) where status = 'active';

alter table public.person_vehicles enable row level security;

drop policy if exists "person_vehicles_read" on public.person_vehicles;
create policy "person_vehicles_read" on public.person_vehicles
  for select to authenticated
  using (has_permission('visitors.read', condominium_id) or has_permission('providers.read', condominium_id));

drop policy if exists "person_vehicles_insert" on public.person_vehicles;
create policy "person_vehicles_insert" on public.person_vehicles
  for insert to authenticated
  with check (has_permission('visitors.manage', condominium_id) or has_permission('providers.manage', condominium_id));

drop policy if exists "person_vehicles_update" on public.person_vehicles;
create policy "person_vehicles_update" on public.person_vehicles
  for update to authenticated
  using (has_permission('visitors.manage', condominium_id) or has_permission('providers.manage', condominium_id))
  with check (has_permission('visitors.manage', condominium_id) or has_permission('providers.manage', condominium_id));

-- 4. Private bucket for registration photos. Photos are never public: the app reads them through signed URLs.
insert into storage.buckets (id, name, public)
values ('gatehouse-photos', 'gatehouse-photos', false)
on conflict (id) do nothing;
