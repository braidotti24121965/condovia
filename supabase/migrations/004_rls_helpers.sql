create or replace function public.current_user_account_id()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select ua.id
  from public.user_accounts ua
  where ua.auth_user_id = (select auth.uid())
    and ua.status = 'active'
  limit 1
$$;

create or replace function public.has_condominium_access(target_condominium_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.condominium_memberships cm
    where cm.user_account_id = public.current_user_account_id()
      and cm.condominium_id = target_condominium_id
      and cm.status <> 'active'
  ) and (exists (
    select 1
    from public.condominium_memberships cm
    join public.condominiums c on c.id = cm.condominium_id
    where cm.user_account_id = public.current_user_account_id()
      and cm.condominium_id = target_condominium_id
      and cm.status = 'active'
      and cm.starts_at <= now()
      and (cm.ends_at is null or cm.ends_at > now())
      and c.status = 'active'
  )
  or exists (
    select 1
    from public.role_assignments ra
    join public.roles r on r.id = ra.role_id
    where ra.user_account_id = public.current_user_account_id()
      and ra.condominium_id = target_condominium_id
      and ra.status = 'active'
      and r.status = 'active'
      and (ra.ends_at is null or ra.ends_at > now())
      and ra.starts_at <= now()
      and exists (
        select 1 from public.permissions p
        join public.role_permissions rp on rp.permission_id = p.id
        where rp.role_id = r.id and p.code = 'context.read'
      )
  ))
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
    join public.permissions p on p.id = po.permission_id
    where po.user_account_id = a.id
      and p.code = permission_code
      and po.condominium_id = target_condominium_id
      and po.effect in ('allow', 'deny')
      and po.starts_at <= now()
      and (po.ends_at is null or po.ends_at > now())
    union all
    select 'allow'::text
    from public.role_assignments ra
    join public.roles r on r.id = ra.role_id
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions p on p.id = rp.permission_id
    join account a on a.id = ra.user_account_id
    where ra.condominium_id = target_condominium_id
      and ra.status = 'active' and r.status = 'active'
      and (ra.ends_at is null or ra.ends_at > now())
      and ra.starts_at <= now()
      and p.code = permission_code
  )
  select public.has_condominium_access(target_condominium_id)
    and coalesce((select bool_and(effect <> 'deny') and bool_or(effect = 'allow') from matching), false)
$$;

create or replace function public.has_administrator_access(target_administrator_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.administrator_memberships am
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
    select po.effect from public.permission_overrides po
    join account a on a.id = po.user_account_id
    join public.permissions p on p.id = po.permission_id
    where po.administrator_id = target_administrator_id and p.code = permission_code
      and po.starts_at <= now()
      and (po.ends_at is null or po.ends_at > now())
    union all
    select 'allow'::text from public.role_assignments ra
    join account a on a.id = ra.user_account_id
    join public.roles r on r.id = ra.role_id and r.status = 'active'
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions p on p.id = rp.permission_id
    where ra.administrator_id = target_administrator_id and ra.status = 'active'
      and (ra.ends_at is null or ra.ends_at > now()) and ra.starts_at <= now() and p.code = permission_code
  )
  select public.has_administrator_access(target_administrator_id)
    and coalesce((select bool_and(effect <> 'deny') and bool_or(effect = 'allow') from matching), false)
$$;

create or replace function public.get_authorized_condominiums()
returns table (condominium_id uuid, condominium_name text, role_name text)
language sql stable security definer
set search_path = ''
as $$
  select c.id, c.name, coalesce(r.name, 'Membro')
  from public.condominiums c
  left join public.condominium_memberships cm
    on cm.condominium_id = c.id
    and cm.user_account_id = public.current_user_account_id()
    and cm.status = 'active'
    and cm.starts_at <= now()
    and (cm.ends_at is null or cm.ends_at > now())
  left join public.role_assignments ra
    on ra.condominium_id = c.id
    and ra.user_account_id = public.current_user_account_id()
    and ra.status = 'active'
    and ra.starts_at <= now()
    and (ra.ends_at is null or ra.ends_at > now())
  left join public.roles r on r.id = ra.role_id and r.status = 'active'
  where c.status = 'active'
    and (cm.id is not null or (ra.id is not null and exists (
      select 1 from public.role_permissions rp
      join public.permissions p on p.id = rp.permission_id
      where rp.role_id = r.id and p.code = 'context.read'
    )))
    and public.has_permission('context.read', c.id)
  union
  select c.id, c.name, coalesce(r.name, 'Gestor')
  from public.condominiums c
  join public.administrator_condominium_access aca on aca.condominium_id = c.id and aca.status = 'active'
  join public.administrator_memberships am on am.administrator_id = aca.administrator_id
    and am.user_account_id = public.current_user_account_id()
    and am.status = 'active'
    and am.starts_at <= now()
    and (am.ends_at is null or am.ends_at > now())
  left join public.role_assignments ra on ra.condominium_id = c.id
    and ra.user_account_id = public.current_user_account_id() and ra.status = 'active'
  left join public.roles r on r.id = ra.role_id and r.status = 'active'
  where c.status = 'active' and public.has_permission('context.read', c.id)
$$;

create or replace function public.has_platform_permission(permission_code text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  with account as (select public.current_user_account_id() as id),
  matching as (
    select po.effect from public.permission_overrides po
    join public.permissions p on p.id = po.permission_id
    join account a on a.id = po.user_account_id
    where po.platform_scope and p.code = permission_code
      and (po.ends_at is null or po.ends_at > now())
      and po.starts_at <= now()
    union all
    select 'allow'::text from public.role_assignments ra
    join public.roles r on r.id = ra.role_id
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions p on p.id = rp.permission_id
    join account a on a.id = ra.user_account_id
    where ra.platform_scope and ra.status = 'active'
      and (ra.ends_at is null or ra.ends_at > now())
      and ra.starts_at <= now()
      and p.code = permission_code
  )
  select exists(select 1 from public.platform_memberships pm
    join account a on a.id = pm.user_account_id where pm.status = 'active')
    and coalesce((select bool_and(effect <> 'deny') and bool_or(effect = 'allow') from matching), false)
$$;

revoke all on function public.current_user_account_id() from public, anon;
revoke all on function public.has_condominium_access(uuid) from public, anon;
revoke all on function public.has_permission(text, uuid) from public, anon;
revoke all on function public.has_administrator_access(uuid) from public, anon;
revoke all on function public.has_platform_permission(text) from public, anon;
grant execute on function public.current_user_account_id() to authenticated;
grant execute on function public.has_condominium_access(uuid) to authenticated;
grant execute on function public.has_permission(text, uuid) to authenticated;
grant execute on function public.has_administrator_access(uuid) to authenticated;
revoke all on function public.has_administrator_permission(text, uuid) from public, anon;
grant execute on function public.has_administrator_permission(text, uuid) to authenticated;
grant execute on function public.has_platform_permission(text) to authenticated;
revoke all on function public.get_authorized_condominiums() from public, anon;
grant execute on function public.get_authorized_condominiums() to authenticated;
