create or replace function public.permission_code_matches(candidate_permission_id uuid, requested_code text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.permissions p
    where p.id = candidate_permission_id
      and (p.code = requested_code or exists (
        select 1
        from public.permission_equivalences pe
        join public.permissions legacy on legacy.id = pe.legacy_permission_id
        join public.permissions canonical on canonical.id = pe.canonical_permission_id
        where (pe.legacy_permission_id = candidate_permission_id and canonical.code = requested_code)
          or (pe.canonical_permission_id = candidate_permission_id and legacy.code = requested_code)
      ))
  )
$$;

create or replace function public.has_administrator_access(target_administrator_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.current_user_account_id() is not null and exists (
    select 1
    from public.administrator_memberships am
    join public.administrators a on a.id = am.administrator_id and a.status = 'active'
    join public.clients c on c.id = a.client_id and c.status = 'active'
    where am.administrator_id = target_administrator_id
      and am.user_account_id = public.current_user_account_id()
      and am.status = 'active'
      and am.starts_at <= now()
      and (am.ends_at is null or am.ends_at > now())
  )
$$;

create or replace function public.has_administrator_permission(permission_code text, target_administrator_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  with account as (select public.current_user_account_id() as id),
  matching as (
    select po.effect
    from public.permission_overrides po
    join account a on a.id = po.user_account_id
    where po.administrator_id = target_administrator_id
      and public.permission_code_matches(po.permission_id, permission_code)
      and po.starts_at <= now() and (po.ends_at is null or po.ends_at > now())
    union all
    select 'allow'::text
    from public.role_assignments ra
    join account a on a.id = ra.user_account_id
    join public.roles r on r.id = ra.role_id and r.status = 'active' and r.scope_type = 'administrator'
    left join public.role_equivalences re on re.legacy_role_id = ra.role_id
    join public.role_permissions rp on rp.role_id in (ra.role_id, re.canonical_role_id)
    where ra.administrator_id = target_administrator_id and ra.status = 'active'
      and ra.starts_at <= now() and (ra.ends_at is null or ra.ends_at > now())
      and public.permission_code_matches(rp.permission_id, permission_code)
  )
  select public.has_administrator_access(target_administrator_id)
    and coalesce((select bool_and(effect <> 'deny') and bool_or(effect = 'allow') from matching), false)
$$;

create or replace function public.has_platform_permission(permission_code text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  with account as (select public.current_user_account_id() as id),
  matching as (
    select po.effect from public.permission_overrides po
    join account a on a.id = po.user_account_id
    where po.platform_scope
      and public.permission_code_matches(po.permission_id, permission_code)
      and po.starts_at <= now() and (po.ends_at is null or po.ends_at > now())
    union all
    select 'allow'::text from public.role_assignments ra
    join account a on a.id = ra.user_account_id
    join public.roles r on r.id = ra.role_id and r.status = 'active' and r.scope_type = 'platform'
    left join public.role_equivalences re on re.legacy_role_id = ra.role_id
    join public.role_permissions rp on rp.role_id in (ra.role_id, re.canonical_role_id)
    where ra.platform_scope and ra.status = 'active'
      and ra.starts_at <= now() and (ra.ends_at is null or ra.ends_at > now())
      and public.permission_code_matches(rp.permission_id, permission_code)
  )
  select public.current_user_account_id() is not null
    and exists (select 1 from public.platform_memberships pm
      join account a on a.id = pm.user_account_id
      where pm.status = 'active' and pm.starts_at <= now()
        and (pm.ends_at is null or pm.ends_at > now()))
    and coalesce((select bool_and(effect <> 'deny') and bool_or(effect = 'allow') from matching), false)
$$;

create or replace function public.has_condominium_access(target_condominium_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.current_user_account_id() is not null and exists (
    select 1
    from public.condominiums c
    where c.id = target_condominium_id and c.status = 'active'
      and (
        exists (
          select 1 from public.condominium_memberships cm
          where cm.condominium_id = c.id
            and cm.user_account_id = public.current_user_account_id()
            and cm.status = 'active' and cm.starts_at <= now()
            and (cm.ends_at is null or cm.ends_at > now())
        )
        or exists (
          select 1
          from public.administrator_condominium_access aca
          join public.administrator_memberships am on am.administrator_id = aca.administrator_id
          join public.administrators a on a.id = aca.administrator_id and a.status = 'active'
          join public.clients cl on cl.id = a.client_id and cl.status = 'active'
          where aca.condominium_id = c.id and aca.status = 'active'
            and aca.starts_at <= now() and (aca.ends_at is null or aca.ends_at > now())
            and am.user_account_id = public.current_user_account_id()
            and am.status = 'active' and am.starts_at <= now()
            and (am.ends_at is null or am.ends_at > now())
            and public.has_administrator_permission('context.read', aca.administrator_id)
        )
      )
  )
$$;

create or replace function public.has_permission(permission_code text, target_condominium_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  with account as (select public.current_user_account_id() as id),
  matching as (
    select po.effect
    from public.permission_overrides po
    join account a on a.id = po.user_account_id
    where public.permission_code_matches(po.permission_id, permission_code)
      and po.starts_at <= now() and (po.ends_at is null or po.ends_at > now())
      and (
        po.condominium_id = target_condominium_id
        or (po.administrator_id is not null and exists (
          select 1 from public.administrator_condominium_access aca
          join public.administrator_memberships am on am.administrator_id = aca.administrator_id
          where aca.administrator_id = po.administrator_id
            and aca.condominium_id = target_condominium_id and aca.status = 'active'
            and aca.starts_at <= now() and (aca.ends_at is null or aca.ends_at > now())
            and am.user_account_id = a.id and am.status = 'active'
            and am.starts_at <= now() and (am.ends_at is null or am.ends_at > now())
        ))
      )
    union all
    select 'allow'::text
    from public.role_assignments ra
    join account a on a.id = ra.user_account_id
    join public.roles r on r.id = ra.role_id and r.status = 'active'
    left join public.role_equivalences re on re.legacy_role_id = ra.role_id
    join public.role_permissions rp on rp.role_id in (ra.role_id, re.canonical_role_id)
    where ra.status = 'active' and ra.starts_at <= now()
      and (ra.ends_at is null or ra.ends_at > now())
      and (
        (ra.condominium_id = target_condominium_id and r.scope_type = 'condominium')
        or (ra.administrator_id is not null and r.scope_type = 'administrator' and exists (
          select 1 from public.administrator_condominium_access aca
          join public.administrator_memberships am on am.administrator_id = aca.administrator_id
          where aca.administrator_id = ra.administrator_id
            and aca.condominium_id = target_condominium_id and aca.status = 'active'
            and aca.starts_at <= now() and (aca.ends_at is null or aca.ends_at > now())
            and am.user_account_id = a.id and am.status = 'active'
            and am.starts_at <= now() and (am.ends_at is null or am.ends_at > now())
        ))
      )
      and public.permission_code_matches(rp.permission_id, permission_code)
  )
  select public.has_condominium_access(target_condominium_id)
    and coalesce((select bool_and(effect <> 'deny') and bool_or(effect = 'allow') from matching), false)
$$;

create or replace function public.get_authorized_condominiums()
returns table (condominium_id uuid, condominium_name text, role_name text)
language sql stable security definer
set search_path = ''
as $$
  select c.id, c.name, coalesce((
    select r.name
    from public.role_assignments ra
    join public.roles r on r.id = ra.role_id and r.status = 'active'
    where ra.user_account_id = cm.user_account_id and ra.condominium_id = c.id
      and ra.status = 'active' and ra.starts_at <= now()
      and (ra.ends_at is null or ra.ends_at > now())
      and public.has_permission('context.read', c.id)
    order by r.code
    limit 1
  ), 'Membro')
  from public.condominium_memberships cm
  join public.condominiums c on c.id = cm.condominium_id and c.status = 'active'
  where cm.user_account_id = public.current_user_account_id()
    and cm.status = 'active' and cm.starts_at <= now()
    and (cm.ends_at is null or cm.ends_at > now())
    and public.has_permission('context.read', c.id)
$$;

create or replace function public.get_authorized_administrators()
returns table (administrator_id uuid, administrator_name text, role_name text)
language sql stable security definer
set search_path = ''
as $$
  select a.id, a.legal_name, r.name
  from public.administrator_memberships am
  join public.administrators a on a.id = am.administrator_id and a.status = 'active'
  join public.clients c on c.id = a.client_id and c.status = 'active'
  join public.role_assignments ra on ra.user_account_id = am.user_account_id
    and ra.administrator_id = a.id and ra.status = 'active'
    and ra.starts_at <= now() and (ra.ends_at is null or ra.ends_at > now())
  join public.roles r on r.id = ra.role_id and r.status = 'active' and r.scope_type = 'administrator'
  where am.user_account_id = public.current_user_account_id()
    and am.status = 'active' and am.starts_at <= now()
    and (am.ends_at is null or am.ends_at > now())
    and public.has_administrator_permission('context.read', a.id)
$$;

create or replace function public.can_read_person_in_authorized_context(target_person_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_accounts target_account
    join public.condominium_memberships cm on cm.user_account_id = target_account.id
    where target_account.person_id = target_person_id
      and target_account.status = 'active'
      and cm.status = 'active' and cm.starts_at <= now()
      and (cm.ends_at is null or cm.ends_at > now())
      and public.has_permission('people.read', cm.condominium_id)
  )
$$;

create or replace function public.record_user_login()
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare updated_rows integer;
begin
  update public.user_accounts
    set last_login_at = now(), updated_at = now()
    where auth_user_id = (select auth.uid()) and status = 'active';
  get diagnostics updated_rows = row_count;
  return updated_rows = 1;
end
$$;

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_auth_user_id uuid references auth.users(id) on delete set null,
  actor_user_account_id uuid references public.user_accounts(id) on delete set null,
  event_type text not null,
  entity_type text not null check (entity_type in (
    'user_invitation', 'condominium_membership', 'administrator_membership',
    'administrator_condominium_access', 'platform_membership', 'role_assignment',
    'permission_override', 'user_account'
  )),
  entity_id uuid not null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);
create index audit_events_entity_created_idx on public.audit_events(entity_type, entity_id, created_at desc);
create index audit_events_actor_created_idx on public.audit_events(actor_user_account_id, created_at desc);
alter table public.audit_events enable row level security;
revoke all on public.audit_events from public, anon, authenticated;

create or replace function public.audit_identity_change()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  entity_name text;
  row_id uuid;
  old_status text;
  new_status text;
  event_name text;
  safe_metadata jsonb := '{}'::jsonb;
begin
  entity_name := case tg_table_name
    when 'user_invitations' then 'user_invitation'
    when 'condominium_memberships' then 'condominium_membership'
    when 'administrator_memberships' then 'administrator_membership'
    when 'administrator_condominium_access' then 'administrator_condominium_access'
    when 'platform_memberships' then 'platform_membership'
    when 'role_assignments' then 'role_assignment'
    when 'permission_overrides' then 'permission_override'
    when 'user_accounts' then 'user_account'
    else null
  end;
  if entity_name is null then return coalesce(new, old); end if;

  if tg_op <> 'INSERT' then old_status := to_jsonb(old)->>'status'; end if;
  if tg_op <> 'DELETE' then new_status := to_jsonb(new)->>'status'; end if;
  row_id := coalesce((to_jsonb(new)->>'id')::uuid, (to_jsonb(old)->>'id')::uuid);

  if entity_name = 'user_account' then
    if tg_op = 'INSERT' or old_status is not distinct from new_status then
      return coalesce(new, old);
    end if;
    event_name := 'user_account.status_changed';
  elsif tg_op = 'INSERT' then
    event_name := entity_name || '.created';
  elsif old_status is distinct from new_status then
    event_name := entity_name || '.status_changed';
  else
    event_name := entity_name || '.changed';
  end if;

  if old_status is not null or new_status is not null then
    safe_metadata := jsonb_strip_nulls(jsonb_build_object('old_status', old_status, 'new_status', new_status));
  end if;
  if entity_name in ('role_assignment', 'permission_override') then
    safe_metadata := safe_metadata || jsonb_strip_nulls(jsonb_build_object(
      'role_id', to_jsonb(new)->>'role_id',
      'permission_id', to_jsonb(new)->>'permission_id',
      'condominium_id', to_jsonb(new)->>'condominium_id',
      'administrator_id', to_jsonb(new)->>'administrator_id',
      'platform_scope', to_jsonb(new)->>'platform_scope',
      'effect', to_jsonb(new)->>'effect'
    ));
  end if;

  insert into public.audit_events(
    actor_auth_user_id, actor_user_account_id, event_type, entity_type, entity_id, metadata
  ) values (
    (select auth.uid()), public.current_user_account_id(), event_name, entity_name, row_id, safe_metadata
  );
  return coalesce(new, old);
end
$$;

create trigger user_invitations_audit
after insert or update on public.user_invitations for each row execute function public.audit_identity_change();
create trigger condominium_memberships_audit
after insert or update on public.condominium_memberships for each row execute function public.audit_identity_change();
create trigger administrator_memberships_audit
after insert or update on public.administrator_memberships for each row execute function public.audit_identity_change();
create trigger administrator_condominium_access_audit
after insert or update on public.administrator_condominium_access for each row execute function public.audit_identity_change();
create trigger platform_memberships_audit
after insert or update on public.platform_memberships for each row execute function public.audit_identity_change();
create trigger role_assignments_audit
after insert or update on public.role_assignments for each row execute function public.audit_identity_change();
create trigger permission_overrides_audit
after insert or update on public.permission_overrides for each row execute function public.audit_identity_change();
create trigger user_accounts_audit
after update of status on public.user_accounts for each row execute function public.audit_identity_change();

create or replace function public.validate_role_assignment_actor()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare actor_id uuid := public.current_user_account_id();
begin
  if actor_id is not null and actor_id = new.user_account_id then
    if new.condominium_id is not null
      and not public.has_permission('roles.assign', new.condominium_id) then
      raise exception 'Not authorized to assign a role to self' using errcode = '42501';
    elsif new.administrator_id is not null
      and not public.has_administrator_permission('roles.assign', new.administrator_id) then
      raise exception 'Not authorized to assign a role to self' using errcode = '42501';
    elsif new.platform_scope
      and not public.has_platform_permission('roles.assign') then
      raise exception 'Not authorized to assign a role to self' using errcode = '42501';
    end if;
  end if;
  return new;
end
$$;
create trigger role_assignment_actor_guard
before insert or update of user_account_id, role_id, condominium_id, administrator_id, platform_scope
on public.role_assignments for each row execute function public.validate_role_assignment_actor();

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

create or replace function public.can_read_person_in_authorized_context(target_person_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_accounts target_account
    join public.condominium_memberships cm on cm.user_account_id = target_account.id
    where target_account.person_id = target_person_id and target_account.status = 'active'
      and cm.status = 'active' and cm.starts_at <= now()
      and (cm.ends_at is null or cm.ends_at > now())
      and public.has_permission('people.read', cm.condominium_id)
  )
$$;

create or replace function public.record_user_login()
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare updated_rows integer;
begin
  update public.user_accounts
    set last_login_at = now(), updated_at = now()
    where auth_user_id = (select auth.uid()) and status = 'active';
  get diagnostics updated_rows = row_count;
  return updated_rows = 1;
end
$$;

drop policy people_read_self on public.people;
create policy people_read_self on public.people
  for select to authenticated using (
    id = (select ua.person_id from public.user_accounts ua
      where ua.auth_user_id = (select auth.uid()) and ua.status = 'active')
    or public.can_read_person_in_authorized_context(id)
  );

drop policy condominium_memberships_read_context on public.condominium_memberships;
create policy condominium_memberships_read_context on public.condominium_memberships
  for select to authenticated using (
    user_account_id = public.current_user_account_id()
    or public.has_permission('memberships.read', condominium_id)
    or (public.has_permission('condominium.read', condominium_id)
      and public.has_permission('context.read', condominium_id))
  );

drop policy administrator_memberships_read_self on public.administrator_memberships;
create policy administrator_memberships_read_self on public.administrator_memberships
  for select to authenticated using (
    user_account_id = public.current_user_account_id()
    or public.has_administrator_permission('memberships.read', administrator_id)
    or public.has_administrator_access(administrator_id)
  );

drop policy role_assignments_read_self on public.role_assignments;
create policy role_assignments_read_self on public.role_assignments
  for select to authenticated using (
    user_account_id = public.current_user_account_id()
    or (condominium_id is not null and (
      public.has_permission('roles.read', condominium_id)
      or public.has_permission('condominium.manage', condominium_id)
    ))
    or (administrator_id is not null and public.has_administrator_permission('roles.read', administrator_id))
  );

revoke all on function public.permission_code_matches(uuid, text) from public, anon;
revoke all on function public.can_read_person_in_authorized_context(uuid) from public, anon;
revoke all on function public.record_user_login() from public, anon;
revoke all on function public.audit_identity_change() from public, anon, authenticated;
revoke all on function public.validate_role_assignment_actor() from public, anon, authenticated;
grant execute on function public.permission_code_matches(uuid, text) to authenticated;
grant execute on function public.can_read_person_in_authorized_context(uuid) to authenticated;
grant execute on function public.record_user_login() to authenticated;

revoke all on function public.has_condominium_access(uuid) from public, anon;
revoke all on function public.has_permission(text, uuid) from public, anon;
revoke all on function public.has_administrator_access(uuid) from public, anon;
revoke all on function public.has_administrator_permission(text, uuid) from public, anon;
revoke all on function public.has_platform_permission(text) from public, anon;
revoke all on function public.get_authorized_condominiums() from public, anon;
revoke all on function public.get_authorized_administrators() from public, anon;
grant execute on function public.has_condominium_access(uuid) to authenticated;
grant execute on function public.has_permission(text, uuid) to authenticated;
grant execute on function public.has_administrator_access(uuid) to authenticated;
grant execute on function public.has_administrator_permission(text, uuid) to authenticated;
grant execute on function public.has_platform_permission(text) to authenticated;
grant execute on function public.get_authorized_condominiums() to authenticated;
grant execute on function public.get_authorized_administrators() to authenticated;
