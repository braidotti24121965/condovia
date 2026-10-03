-- Add the explicit P1 scope while retaining `scope` for existing application code.
alter table public.roles add column scope_type text;
update public.roles set scope_type = scope where scope_type is null;
alter table public.roles
  alter column scope_type set not null,
  add constraint roles_scope_type_check
    check (scope_type in ('condominium', 'administrator', 'platform'));

create or replace function public.sync_role_scope_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.scope_type is null then
      new.scope_type := new.scope;
    elsif new.scope is null then
      new.scope := new.scope_type;
    elsif new.scope is distinct from new.scope_type then
      raise exception 'Role scope and scope_type must match' using errcode = '23514';
    end if;
  elsif new.scope is distinct from old.scope
      and new.scope_type is not distinct from old.scope_type then
    new.scope_type := new.scope;
  elsif new.scope_type is distinct from old.scope_type
      and new.scope is not distinct from old.scope then
    new.scope := new.scope_type;
  elsif new.scope is distinct from new.scope_type then
    raise exception 'Role scope and scope_type must match' using errcode = '23514';
  end if;
  return new;
end
$$;
create trigger roles_sync_scope_columns
before insert or update of scope, scope_type on public.roles
for each row execute function public.sync_role_scope_columns();
revoke all on function public.sync_role_scope_columns() from public, anon, authenticated;

create table public.role_equivalences (
  legacy_role_id uuid primary key references public.roles(id) on delete restrict,
  canonical_role_id uuid not null references public.roles(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (legacy_role_id <> canonical_role_id)
);
create table public.permission_equivalences (
  legacy_permission_id uuid primary key references public.permissions(id) on delete restrict,
  canonical_permission_id uuid not null references public.permissions(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (legacy_permission_id <> canonical_permission_id)
);

create or replace function public.validate_role_equivalence()
returns trigger
language plpgsql
set search_path = ''
as $$
declare legacy_scope text; canonical_scope text; legacy_code text; canonical_code text;
begin
  select scope_type, code into legacy_scope, legacy_code from public.roles where id = new.legacy_role_id;
  select scope_type, code into canonical_scope, canonical_code from public.roles where id = new.canonical_role_id;
  if not (
    (legacy_code = 'condominium.resident_owner' and canonical_code = 'condominium.resident')
    or (legacy_code = 'condominium.resident_tenant' and canonical_code = 'condominium.resident')
  ) then
    raise exception 'Role equivalence is reserved for explicit migration compatibility mappings' using errcode = '23514';
  end if;
  if legacy_scope is distinct from canonical_scope then
    raise exception 'Equivalent roles must have the same scope' using errcode = '23514';
  end if;
  return new;
end
$$;
create trigger role_equivalences_scope_guard
before insert or update on public.role_equivalences
for each row execute function public.validate_role_equivalence();

create or replace function public.validate_permission_equivalence()
returns trigger
language plpgsql
set search_path = ''
as $$
declare legacy_scope text; canonical_scope text;
begin
  select scope into legacy_scope from public.permissions where id = new.legacy_permission_id;
  select scope into canonical_scope from public.permissions where id = new.canonical_permission_id;
  if legacy_scope is distinct from canonical_scope then
    raise exception 'Equivalent permissions must have the same scope' using errcode = '23514';
  end if;
  return new;
end
$$;
create trigger permission_equivalences_scope_guard
before insert or update on public.permission_equivalences
for each row execute function public.validate_permission_equivalence();

revoke all on function public.validate_role_equivalence() from public, anon, authenticated;
revoke all on function public.validate_permission_equivalence() from public, anon, authenticated;

alter table public.role_equivalences enable row level security;
alter table public.permission_equivalences enable row level security;
revoke all on public.role_equivalences, public.permission_equivalences from public, anon, authenticated;
comment on table public.role_equivalences is
  'Migration compatibility map only; not an application RBAC mechanism. Allowed mappings are explicitly constrained by validate_role_equivalence().';

insert into public.roles (code, name, scope, scope_type) values
  ('condominium.resident', 'Morador', 'condominium', 'condominium'),
  ('administrator.operator', 'Operador da administradora', 'administrator', 'administrator')
on conflict (code) do nothing;

insert into public.role_equivalences (legacy_role_id, canonical_role_id)
select legacy.id, canonical.id
from (values ('condominium.resident_owner', 'condominium.resident'),
             ('condominium.resident_tenant', 'condominium.resident')) as codes(legacy_code, canonical_code)
join public.roles legacy on legacy.code = codes.legacy_code
join public.roles canonical on canonical.code = codes.canonical_code
on conflict (legacy_role_id) do nothing;

insert into public.permissions (code, description, scope) values
  ('condominiums.read', 'Visualizar dados permitidos do condomínio', 'condominium'),
  ('condominiums.manage', 'Gerenciar dados permitidos do condomínio', 'condominium'),
  ('people.read', 'Visualizar pessoas vinculadas ao contexto autorizado', 'global'),
  ('people.read_self', 'Visualizar os próprios dados pessoais', 'condominium'),
  ('people.manage', 'Gerenciar pessoas no contexto autorizado', 'global'),
  ('memberships.read', 'Visualizar vínculos no contexto autorizado', 'global'),
  ('memberships.manage', 'Gerenciar vínculos no contexto autorizado', 'global'),
  ('users.invite', 'Convidar usuários para o contexto autorizado', 'global'),
  ('roles.read', 'Visualizar roles do contexto autorizado', 'global'),
  ('roles.assign', 'Atribuir roles no contexto autorizado', 'global'),
  ('platform.clients.read', 'Visualizar clientes da plataforma', 'platform'),
  ('platform.clients.manage', 'Gerenciar clientes da plataforma', 'platform')
on conflict (code) do nothing;

insert into public.permission_equivalences (legacy_permission_id, canonical_permission_id)
select legacy.id, canonical.id
from (values ('condominium.read', 'condominiums.read'),
             ('condominium.manage', 'condominiums.manage'),
             ('profile.read_self', 'people.read_self')) as codes(legacy_code, canonical_code)
join public.permissions legacy on legacy.code = codes.legacy_code
join public.permissions canonical on canonical.code = codes.canonical_code
on conflict (legacy_permission_id) do nothing;

-- Preserve the existing resident baseline grant set; do not infer grants for
-- administrator.operator or other new management permissions.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('people.read_self', 'context.read')
where r.code = 'condominium.resident'
on conflict do nothing;

create or replace function public.validate_role_assignment_scope()
returns trigger
language plpgsql
set search_path = ''
as $$
declare role_scope text;
begin
  select scope_type into role_scope from public.roles where id = new.role_id;
  if (new.condominium_id is not null and role_scope <> 'condominium')
    or (new.administrator_id is not null and role_scope <> 'administrator')
    or (new.platform_scope and role_scope <> 'platform') then
    raise exception 'Role scope does not match assignment scope' using errcode = '23514';
  end if;
  return new;
end
$$;

create or replace function public.validate_role_permission_scope()
returns trigger
language plpgsql
set search_path = ''
as $$
declare role_scope text; permission_scope text;
begin
  select scope_type into role_scope from public.roles where id = new.role_id;
  select scope into permission_scope from public.permissions where id = new.permission_id;
  if permission_scope <> 'global' and role_scope <> permission_scope then
    raise exception 'Permission scope does not match role scope' using errcode = '23514';
  end if;
  return new;
end
$$;
