create table public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  scope text not null check (scope in ('condominium', 'administrator', 'platform')),
  status text not null default 'active' check (status in ('active', 'retired')),
  created_at timestamptz not null default now()
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text not null,
  scope text not null check (scope in ('condominium', 'administrator', 'platform', 'global')),
  created_at timestamptz not null default now()
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table public.role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_account_id uuid not null references public.user_accounts(id),
  role_id uuid not null references public.roles(id),
  condominium_id uuid references public.condominiums(id),
  administrator_id uuid references public.administrators(id),
  platform_scope boolean not null default false,
  status text not null default 'active' check (status in ('active', 'suspended', 'ended')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  check (num_nonnulls(condominium_id, administrator_id, nullif(platform_scope, false)::boolean) = 1)
);

create table public.permission_overrides (
  id uuid primary key default gen_random_uuid(),
  user_account_id uuid not null references public.user_accounts(id),
  permission_id uuid not null references public.permissions(id),
  condominium_id uuid references public.condominiums(id),
  administrator_id uuid references public.administrators(id),
  platform_scope boolean not null default false,
  effect text not null check (effect in ('allow', 'deny')),
  reason text not null check (length(trim(reason)) > 0),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  check (num_nonnulls(condominium_id, administrator_id, nullif(platform_scope, false)::boolean) = 1)
);

create or replace function public.validate_role_assignment_scope()
returns trigger
language plpgsql
set search_path = ''
as $$
declare role_scope text;
begin
  select scope into role_scope from public.roles where id = new.role_id;
  if (new.condominium_id is not null and role_scope <> 'condominium')
    or (new.administrator_id is not null and role_scope <> 'administrator')
    or (new.platform_scope and role_scope <> 'platform') then
    raise exception 'Role scope does not match assignment scope' using errcode = '23514';
  end if;
  return new;
end
$$;

create trigger role_assignment_scope_guard
before insert or update of role_id, condominium_id, administrator_id, platform_scope
on public.role_assignments for each row execute function public.validate_role_assignment_scope();

create or replace function public.validate_role_permission_scope()
returns trigger
language plpgsql
set search_path = ''
as $$
declare role_scope text; permission_scope text;
begin
  select scope into role_scope from public.roles where id = new.role_id;
  select scope into permission_scope from public.permissions where id = new.permission_id;
  if permission_scope <> 'global' and role_scope <> permission_scope then
    raise exception 'Permission scope does not match role scope' using errcode = '23514';
  end if;
  return new;
end
$$;

create trigger role_permission_scope_guard
before insert or update on public.role_permissions for each row execute function public.validate_role_permission_scope();

create or replace function public.validate_permission_override_scope()
returns trigger
language plpgsql
set search_path = ''
as $$
declare permission_scope text;
begin
  select scope into permission_scope from public.permissions where id = new.permission_id;
  if (new.condominium_id is not null and permission_scope not in ('condominium', 'global'))
    or (new.administrator_id is not null and permission_scope not in ('administrator', 'global'))
    or (new.platform_scope and permission_scope not in ('platform', 'global')) then
    raise exception 'Permission scope does not match override scope' using errcode = '23514';
  end if;
  return new;
end
$$;

create trigger permission_override_scope_guard
before insert or update of permission_id, condominium_id, administrator_id, platform_scope
on public.permission_overrides for each row execute function public.validate_permission_override_scope();

revoke all on function public.validate_role_assignment_scope() from public, anon, authenticated;
revoke all on function public.validate_role_permission_scope() from public, anon, authenticated;
revoke all on function public.validate_permission_override_scope() from public, anon, authenticated;

create index role_assignments_condominium_idx on public.role_assignments(user_account_id, condominium_id, status) where condominium_id is not null;
create index role_assignments_administrator_idx on public.role_assignments(user_account_id, administrator_id, status) where administrator_id is not null;
create index permission_overrides_condominium_idx on public.permission_overrides(user_account_id, condominium_id, permission_id) where condominium_id is not null;
create index permission_overrides_administrator_idx on public.permission_overrides(user_account_id, administrator_id, permission_id) where administrator_id is not null;
