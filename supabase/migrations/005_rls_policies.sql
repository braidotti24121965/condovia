do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'clients', 'administrators', 'condominiums', 'plans', 'features',
    'plan_entitlements', 'subscriptions', 'subscription_changes',
    'subscription_entitlement_overrides', 'people', 'person_documents',
    'person_phones', 'person_emails', 'user_accounts', 'user_invitations',
    'condominium_memberships', 'administrator_memberships',
    'administrator_condominium_access', 'platform_memberships', 'roles',
    'permissions', 'role_permissions', 'role_assignments', 'permission_overrides'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end
$$;

-- Supabase grants SQL privileges separately from row-level security. Authenticated
-- clients need SELECT on exposed tables so these policies can decide which rows
-- are visible; tables without a SELECT policy remain closed by RLS.
grant select on all tables in schema public to authenticated;

create policy user_accounts_read_self on public.user_accounts
  for select to authenticated using (auth_user_id = (select auth.uid()));
create policy people_read_self on public.people
  for select to authenticated using (id = (
    select ua.person_id from public.user_accounts ua
    where ua.auth_user_id = (select auth.uid()) and ua.status = 'active'
  ));

create policy administrators_read_authorized on public.administrators
  for select to authenticated using (
    public.has_administrator_permission('administrator.read', id)
    or public.has_administrator_permission('context.read', id)
  );

create policy condominiums_read_authorized on public.condominiums
  for select to authenticated using (
    public.has_permission('condominium.read', id)
    or public.has_permission('context.read', id)
  );

create policy condominium_memberships_read_context on public.condominium_memberships
  for select to authenticated using (
    user_account_id = public.current_user_account_id()
    or (public.has_permission('condominium.read', condominium_id)
      and public.has_permission('context.read', condominium_id))
  );

create policy administrator_memberships_read_self on public.administrator_memberships
  for select to authenticated using (
    user_account_id = public.current_user_account_id()
    or public.has_administrator_access(administrator_id)
  );

create policy role_assignments_read_self on public.role_assignments
  for select to authenticated using (
    user_account_id = public.current_user_account_id()
    or (condominium_id is not null and public.has_permission('condominium.manage', condominium_id))
    or (administrator_id is not null and public.has_administrator_access(administrator_id))
  );

create policy permission_overrides_read_self on public.permission_overrides
  for select to authenticated using (
    user_account_id = public.current_user_account_id()
    or (condominium_id is not null and public.has_permission('condominium.manage', condominium_id))
    or (administrator_id is not null and public.has_administrator_access(administrator_id))
  );

create policy roles_read_authenticated on public.roles
  for select to authenticated using (status = 'active');
create policy permissions_read_authenticated on public.permissions
  for select to authenticated using (true);
create policy role_permissions_read_authenticated on public.role_permissions
  for select to authenticated using (exists (
    select 1 from public.roles r where r.id = role_id and r.status = 'active'
  ));

-- Commercial tables, invitations, contacts and platform memberships are deliberately closed.
