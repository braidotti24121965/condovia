create extension if not exists pgcrypto with schema extensions;

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  status text not null default 'active' check (status in ('active', 'suspended', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.administrators (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id),
  legal_name text not null,
  status text not null default 'active' check (status in ('active', 'suspended', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, client_id)
);

create table public.condominiums (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id),
  administrator_id uuid,
  name text not null,
  status text not null default 'active' check (status in ('active', 'suspended', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (administrator_id, client_id) references public.administrators(id, client_id)
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  status text not null default 'active' check (status in ('active', 'retired')),
  created_at timestamptz not null default now()
);

create table public.features (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.plan_entitlements (
  plan_id uuid not null references public.plans(id) on delete cascade,
  feature_id uuid not null references public.features(id) on delete cascade,
  enabled boolean not null default true,
  limits jsonb not null default '{}'::jsonb check (jsonb_typeof(limits) = 'object'),
  primary key (plan_id, feature_id)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id),
  plan_id uuid not null references public.plans(id),
  status text not null default 'trialing' check (status in ('trialing', 'active', 'past_due', 'cancelled', 'ended')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create table public.subscription_changes (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id),
  from_plan_id uuid references public.plans(id),
  to_plan_id uuid references public.plans(id),
  reason text not null,
  effective_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.subscription_entitlement_overrides (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id),
  feature_id uuid not null references public.features(id),
  enabled boolean not null,
  limits jsonb not null default '{}'::jsonb check (jsonb_typeof(limits) = 'object'),
  reason text not null,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create index condominiums_client_idx on public.condominiums(client_id);
create index condominiums_administrator_idx on public.condominiums(administrator_id) where administrator_id is not null;
create index subscriptions_client_status_idx on public.subscriptions(client_id, status);
