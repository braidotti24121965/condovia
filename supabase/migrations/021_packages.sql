-- 021_packages.sql
-- Packages and Package Collections

create table public.packages (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  unit_id uuid not null references public.units(id) on delete restrict,
  recipient_person_id uuid references public.people(id) on delete set null,
  carrier text,
  description text not null check (char_length(trim(description)) >= 2),
  received_at timestamptz not null default now(),
  received_by_user_account_id uuid not null references public.user_accounts(id) on delete restrict,
  status text not null default 'received' check (status in ('received', 'collected')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index packages_condo_idx on public.packages(condominium_id, status);
create index packages_unit_idx on public.packages(unit_id, status);
create index packages_recipient_idx on public.packages(recipient_person_id) where recipient_person_id is not null;

create table public.package_collections (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null unique references public.packages(id) on delete restrict,
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  collected_at timestamptz not null default now(),
  collected_by_person_id uuid references public.people(id) on delete set null,
  collector_name text,
  collector_document text,
  released_by_user_account_id uuid not null references public.user_accounts(id) on delete restrict,
  notes text,
  created_at timestamptz not null default now()
);

create index package_collections_condo_idx on public.package_collections(condominium_id, collected_at desc);
create index package_collections_pkg_idx on public.package_collections(package_id);
