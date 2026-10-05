-- 018_gatehouse_people.sql
-- Visitors, Service Providers, and Access Points

create table public.visitors (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  full_name text not null check (char_length(trim(full_name)) >= 2),
  document_type text check (document_type is null or document_type in ('cpf', 'rg', 'cnh', 'passport', 'other')),
  document_number text,
  phone text,
  notes text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  created_by uuid references public.user_accounts(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.user_accounts(id) on delete set null
);

create index visitors_condominium_idx on public.visitors(condominium_id);
create index visitors_name_idx on public.visitors(condominium_id, lower(full_name));
create index visitors_doc_idx on public.visitors(condominium_id, document_number) where document_number is not null;

create table public.service_providers (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  full_name text not null check (char_length(trim(full_name)) >= 2),
  document_type text check (document_type is null or document_type in ('cpf', 'rg', 'cnh', 'passport', 'other')),
  document_number text,
  phone text,
  company_name text,
  service_type text,
  notes text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  created_by uuid references public.user_accounts(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.user_accounts(id) on delete set null
);

create index service_providers_condominium_idx on public.service_providers(condominium_id);
create index service_providers_name_idx on public.service_providers(condominium_id, lower(full_name));
create index service_providers_doc_idx on public.service_providers(condominium_id, document_number) where document_number is not null;
create index service_providers_company_idx on public.service_providers(condominium_id, lower(company_name)) where company_name is not null;

create table public.access_points (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  name text not null check (char_length(trim(name)) >= 2),
  type text not null check (type in ('pedestrian', 'vehicle', 'service', 'mixed')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index access_points_condominium_idx on public.access_points(condominium_id);
