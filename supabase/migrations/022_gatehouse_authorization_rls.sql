-- 022_gatehouse_authorization_rls.sql
-- Permissions, Role Grants, Helper Functions, and RLS Policies for Gatehouse

-- 1. Insert P4 Permissions
insert into public.permissions (code, description, scope)
values
  ('gatehouse.read', 'Permite consultar o painel e estado da portaria', 'condominium'),
  ('gatehouse.operate', 'Permite realizar operações diárias de portaria', 'condominium'),
  ('visitors.read', 'Permite consultar o cadastro de visitantes', 'condominium'),
  ('visitors.manage', 'Permite cadastrar e atualizar visitantes', 'condominium'),
  ('providers.read', 'Permite consultar o cadastro de prestadores', 'condominium'),
  ('providers.manage', 'Permite cadastrar e atualizar prestadores', 'condominium'),
  ('access_authorizations.read', 'Permite consultar autorizações e solicitações', 'condominium'),
  ('access_authorizations.manage', 'Permite criar, autorizar ou cancelar acessos', 'condominium'),
  ('access_events.read', 'Permite consultar o histórico e presença', 'condominium'),
  ('access_events.manage', 'Permite registrar entradas e saídas na portaria', 'condominium'),
  ('packages.read', 'Permite consultar encomendas do condomínio ou unidade', 'condominium'),
  ('packages.manage', 'Permite receber e liberar encomendas', 'condominium')
on conflict (code) do update set description = excluded.description, scope = excluded.scope;

-- 2. Conceder permissões às roles
-- Syndic and Manager get all gatehouse permissions
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code in ('condominium.syndic', 'condominium.manager')
  and p.code in (
    'gatehouse.read', 'gatehouse.operate',
    'visitors.read', 'visitors.manage',
    'providers.read', 'providers.manage',
    'access_authorizations.read', 'access_authorizations.manage',
    'access_events.read', 'access_events.manage',
    'packages.read', 'packages.manage'
  )
on conflict do nothing;

-- Doorman gets operational permissions
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'condominium.doorman'
  and p.code in (
    'dashboard.read', 'condominium.read', 'context.read',
    'gatehouse.read', 'gatehouse.operate',
    'visitors.read', 'visitors.manage',
    'providers.read', 'providers.manage',
    'access_authorizations.read',
    'access_events.read', 'access_events.manage',
    'packages.read', 'packages.manage'
  )
on conflict do nothing;

-- Residents get authorization management and package reading for eligible units
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code in ('condominium.resident', 'condominium.resident_owner', 'condominium.resident_tenant')
  and p.code in (
    'access_authorizations.read', 'access_authorizations.manage',
    'packages.read'
  )
on conflict do nothing;

-- 3. Resident unit eligibility helper function
create or replace function public.is_unit_eligible_for_resident(p_unit_id uuid, p_condominium_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.current_person_id() cp
    where cp is not null and (
      exists (
        select 1 from public.unit_occupancies uo
        where uo.unit_id = p_unit_id
          and uo.condominium_id = p_condominium_id
          and uo.person_id = cp
          and uo.starts_at <= current_date
          and (uo.ends_at is null or uo.ends_at > current_date)
      )
      or exists (
        select 1 from public.unit_ownerships ow
        where ow.unit_id = p_unit_id
          and ow.condominium_id = p_condominium_id
          and ow.person_id = cp
          and ow.starts_at <= current_date
          and (ow.ends_at is null or ow.ends_at > current_date)
      )
    )
  );
$$;

revoke all on function public.is_unit_eligible_for_resident(uuid, uuid) from public, anon;
grant execute on function public.is_unit_eligible_for_resident(uuid, uuid) to authenticated;

-- 4. Enable RLS on all 7 tables
alter table public.visitors enable row level security;
alter table public.service_providers enable row level security;
alter table public.access_points enable row level security;
alter table public.access_authorizations enable row level security;
alter table public.access_requests enable row level security;
alter table public.access_events enable row level security;
alter table public.packages enable row level security;
alter table public.package_collections enable row level security;

-- 5. RLS Policies: VISITORS
drop policy if exists "visitors_read" on public.visitors;
create policy "visitors_read" on public.visitors
  for select to authenticated
  using (has_permission('visitors.read', condominium_id));

drop policy if exists "visitors_insert" on public.visitors;
create policy "visitors_insert" on public.visitors
  for insert to authenticated
  with check (has_permission('visitors.manage', condominium_id));

drop policy if exists "visitors_update" on public.visitors;
create policy "visitors_update" on public.visitors
  for update to authenticated
  using (has_permission('visitors.manage', condominium_id))
  with check (has_permission('visitors.manage', condominium_id));

-- 6. RLS Policies: SERVICE PROVIDERS
drop policy if exists "providers_read" on public.service_providers;
create policy "providers_read" on public.service_providers
  for select to authenticated
  using (has_permission('providers.read', condominium_id));

drop policy if exists "providers_insert" on public.service_providers;
create policy "providers_insert" on public.service_providers
  for insert to authenticated
  with check (has_permission('providers.manage', condominium_id));

drop policy if exists "providers_update" on public.service_providers;
create policy "providers_update" on public.service_providers
  for update to authenticated
  using (has_permission('providers.manage', condominium_id))
  with check (has_permission('providers.manage', condominium_id));

-- 7. RLS Policies: ACCESS POINTS
drop policy if exists "access_points_read" on public.access_points;
create policy "access_points_read" on public.access_points
  for select to authenticated
  using (
    has_permission('gatehouse.read', condominium_id) or
    has_permission('gatehouse.operate', condominium_id) or
    has_permission('structures.read', condominium_id)
  );

drop policy if exists "access_points_manage" on public.access_points;
create policy "access_points_manage" on public.access_points
  for all to authenticated
  using (has_permission('structures.manage', condominium_id))
  with check (has_permission('structures.manage', condominium_id));

-- 8. RLS Policies: ACCESS AUTHORIZATIONS
drop policy if exists "access_authorizations_admin_read" on public.access_authorizations;
create policy "access_authorizations_admin_read" on public.access_authorizations
  for select to authenticated
  using (
    has_permission('gatehouse.operate', condominium_id) or
    has_permission('gatehouse.read', condominium_id)
  );

drop policy if exists "access_authorizations_resident_read" on public.access_authorizations;
create policy "access_authorizations_resident_read" on public.access_authorizations
  for select to authenticated
  using (
    has_permission('access_authorizations.read', condominium_id) and
    is_unit_eligible_for_resident(unit_id, condominium_id)
  );

drop policy if exists "access_authorizations_insert" on public.access_authorizations;
create policy "access_authorizations_insert" on public.access_authorizations
  for insert to authenticated
  with check (
    has_permission('access_authorizations.manage', condominium_id) and
    (
      has_permission('gatehouse.operate', condominium_id) or
      is_unit_eligible_for_resident(unit_id, condominium_id)
    )
  );

drop policy if exists "access_authorizations_update" on public.access_authorizations;
create policy "access_authorizations_update" on public.access_authorizations
  for update to authenticated
  using (
    has_permission('access_authorizations.manage', condominium_id) and
    (
      has_permission('gatehouse.operate', condominium_id) or
      is_unit_eligible_for_resident(unit_id, condominium_id)
    )
  )
  with check (
    has_permission('access_authorizations.manage', condominium_id) and
    (
      has_permission('gatehouse.operate', condominium_id) or
      is_unit_eligible_for_resident(unit_id, condominium_id)
    )
  );

-- 9. RLS Policies: ACCESS REQUESTS
drop policy if exists "access_requests_admin_read" on public.access_requests;
create policy "access_requests_admin_read" on public.access_requests
  for select to authenticated
  using (
    has_permission('gatehouse.operate', condominium_id) or
    has_permission('gatehouse.read', condominium_id)
  );

drop policy if exists "access_requests_resident_read" on public.access_requests;
create policy "access_requests_resident_read" on public.access_requests
  for select to authenticated
  using (
    has_permission('access_authorizations.read', condominium_id) and
    is_unit_eligible_for_resident(unit_id, condominium_id)
  );

drop policy if exists "access_requests_insert" on public.access_requests;
create policy "access_requests_insert" on public.access_requests
  for insert to authenticated
  with check (
    has_permission('access_authorizations.manage', condominium_id) or
    has_permission('gatehouse.operate', condominium_id)
  );

drop policy if exists "access_requests_update" on public.access_requests;
create policy "access_requests_update" on public.access_requests
  for update to authenticated
  using (
    has_permission('access_authorizations.manage', condominium_id) or
    has_permission('gatehouse.operate', condominium_id) or
    is_unit_eligible_for_resident(unit_id, condominium_id)
  )
  with check (
    has_permission('access_authorizations.manage', condominium_id) or
    has_permission('gatehouse.operate', condominium_id) or
    is_unit_eligible_for_resident(unit_id, condominium_id)
  );

-- 10. RLS Policies: ACCESS EVENTS
drop policy if exists "access_events_read" on public.access_events;
create policy "access_events_read" on public.access_events
  for select to authenticated
  using (
    has_permission('access_events.read', condominium_id) or
    has_permission('gatehouse.read', condominium_id) or
    has_permission('gatehouse.operate', condominium_id)
  );

drop policy if exists "access_events_insert" on public.access_events;
create policy "access_events_insert" on public.access_events
  for insert to authenticated
  with check (
    has_permission('access_events.manage', condominium_id) or
    has_permission('gatehouse.operate', condominium_id)
  );

-- 11. RLS Policies: PACKAGES
drop policy if exists "packages_admin_read" on public.packages;
create policy "packages_admin_read" on public.packages
  for select to authenticated
  using (
    has_permission('packages.manage', condominium_id) or
    has_permission('gatehouse.read', condominium_id) or
    has_permission('gatehouse.operate', condominium_id)
  );

drop policy if exists "packages_resident_read" on public.packages;
create policy "packages_resident_read" on public.packages
  for select to authenticated
  using (
    has_permission('packages.read', condominium_id) and
    is_unit_eligible_for_resident(unit_id, condominium_id)
  );

drop policy if exists "packages_manage" on public.packages;
create policy "packages_manage" on public.packages
  for all to authenticated
  using (has_permission('packages.manage', condominium_id))
  with check (has_permission('packages.manage', condominium_id));

-- 12. RLS Policies: PACKAGE COLLECTIONS
drop policy if exists "package_collections_admin_read" on public.package_collections;
create policy "package_collections_admin_read" on public.package_collections
  for select to authenticated
  using (
    has_permission('packages.manage', condominium_id) or
    has_permission('gatehouse.read', condominium_id) or
    has_permission('gatehouse.operate', condominium_id)
  );

drop policy if exists "package_collections_resident_read" on public.package_collections;
create policy "package_collections_resident_read" on public.package_collections
  for select to authenticated
  using (
    has_permission('packages.read', condominium_id) and
    exists (
      select 1 from public.packages pkg
      where pkg.id = package_collections.package_id
        and is_unit_eligible_for_resident(pkg.unit_id, package_collections.condominium_id)
    )
  );

drop policy if exists "package_collections_manage" on public.package_collections;
create policy "package_collections_manage" on public.package_collections
  for all to authenticated
  using (has_permission('packages.manage', condominium_id))
  with check (has_permission('packages.manage', condominium_id));

-- 13. Least-privilege Grants
revoke all on public.visitors from public, anon;
revoke all on public.service_providers from public, anon;
revoke all on public.access_points from public, anon;
revoke all on public.access_authorizations from public, anon;
revoke all on public.access_requests from public, anon;
revoke all on public.access_events from public, anon;
revoke all on public.packages from public, anon;
revoke all on public.package_collections from public, anon;

grant select, insert, update on public.visitors to authenticated;
grant select, insert, update on public.service_providers to authenticated;
grant select, insert, update on public.access_points to authenticated;
grant select, insert, update on public.access_authorizations to authenticated;
grant select, insert, update on public.access_requests to authenticated;
grant select, insert on public.access_events to authenticated;
grant select, insert, update on public.packages to authenticated;
grant select, insert on public.package_collections to authenticated;
