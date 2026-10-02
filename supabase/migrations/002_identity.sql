create table public.people (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  preferred_name text,
  status text not null default 'active' check (status in ('active', 'suspended', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.person_documents (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  document_type text not null,
  document_hash text not null,
  created_at timestamptz not null default now(),
  unique (document_type, document_hash)
);

create table public.person_phones (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  phone_e164 text not null,
  is_primary boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (person_id, phone_e164)
);

create table public.person_emails (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  email text not null,
  is_primary boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (person_id, email)
);

create table public.user_accounts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  person_id uuid not null unique references public.people(id),
  status text not null default 'active' check (status in ('active', 'suspended', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_invitations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id),
  email text not null,
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz not null,
  invited_by_user_account_id uuid references public.user_accounts(id),
  created_at timestamptz not null default now()
);

create table public.condominium_memberships (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id),
  user_account_id uuid not null references public.user_accounts(id),
  status text not null default 'active' check (status in ('active', 'suspended', 'ended')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  unique (condominium_id, user_account_id)
);

create table public.administrator_memberships (
  id uuid primary key default gen_random_uuid(),
  administrator_id uuid not null references public.administrators(id),
  user_account_id uuid not null references public.user_accounts(id),
  status text not null default 'active' check (status in ('active', 'suspended', 'ended')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  unique (administrator_id, user_account_id)
);

create table public.administrator_condominium_access (
  id uuid primary key default gen_random_uuid(),
  administrator_id uuid not null references public.administrators(id),
  condominium_id uuid not null references public.condominiums(id),
  status text not null default 'active' check (status in ('active', 'suspended', 'ended')),
  created_at timestamptz not null default now(),
  unique (administrator_id, condominium_id)
);

create table public.platform_memberships (
  id uuid primary key default gen_random_uuid(),
  user_account_id uuid not null references public.user_accounts(id),
  status text not null default 'active' check (status in ('active', 'suspended', 'ended')),
  created_at timestamptz not null default now(),
  unique (user_account_id)
);

create index condominium_memberships_user_status_idx on public.condominium_memberships(user_account_id, status);
create index administrator_memberships_user_status_idx on public.administrator_memberships(user_account_id, status);
create index administrator_condominium_access_condo_status_idx on public.administrator_condominium_access(condominium_id, status);
