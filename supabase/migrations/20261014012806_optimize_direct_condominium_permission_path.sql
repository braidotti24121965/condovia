create or replace function public.has_permission(permission_code text, target_condominium_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  with account as (select public.current_user_account_id() as id),
  direct_allow as (
    select 1
    from public.role_assignments ra
    join account a on a.id = ra.user_account_id
    join public.roles r on r.id = ra.role_id
      and r.status = 'active'
      and r.scope_type = 'condominium'
    join public.role_permissions rp on rp.role_id = ra.role_id
    join public.permissions p on p.id = rp.permission_id
    where ra.condominium_id = target_condominium_id
      and ra.status = 'active'
      and ra.starts_at <= now()
      and (ra.ends_at is null or ra.ends_at > now())
      and p.code = permission_code
      and not exists (
        select 1
        from public.permission_overrides po
        where po.user_account_id = a.id
          and po.condominium_id = target_condominium_id
          and po.effect = 'deny'
          and po.starts_at <= now()
          and (po.ends_at is null or po.ends_at > now())
          and public.permission_code_matches(po.permission_id, permission_code)
      )
  ),
  matching as (
    select po.effect
    from public.permission_overrides po
    join account a on a.id = po.user_account_id
    where public.permission_code_matches(po.permission_id, permission_code)
      and po.starts_at <= now() and (po.ends_at is null or po.ends_at > now())
      and (
        po.condominium_id = target_condominium_id
        or (po.administrator_id is not null and exists (
          select 1
          from public.administrator_condominium_access aca
          join public.administrator_memberships am on am.administrator_id = aca.administrator_id
          where aca.administrator_id = po.administrator_id
            and aca.condominium_id = target_condominium_id
            and aca.status = 'active'
            and aca.starts_at <= now() and (aca.ends_at is null or aca.ends_at > now())
            and am.user_account_id = a.id
            and am.status = 'active'
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
    where ra.status = 'active'
      and ra.starts_at <= now() and (ra.ends_at is null or ra.ends_at > now())
      and (
        (ra.condominium_id = target_condominium_id and r.scope_type = 'condominium')
        or (ra.administrator_id is not null and r.scope_type = 'administrator' and exists (
          select 1
          from public.administrator_condominium_access aca
          join public.administrator_memberships am on am.administrator_id = aca.administrator_id
          where aca.administrator_id = ra.administrator_id
            and aca.condominium_id = target_condominium_id
            and aca.status = 'active'
            and aca.starts_at <= now() and (aca.ends_at is null or aca.ends_at > now())
            and am.user_account_id = a.id
            and am.status = 'active'
            and am.starts_at <= now() and (am.ends_at is null or am.ends_at > now())
        ))
      )
      and public.permission_code_matches(rp.permission_id, permission_code)
  )
  select case
    when exists (select 1 from direct_allow) then true
    when public.has_condominium_access(target_condominium_id)
      and coalesce((select bool_and(effect <> 'deny') and bool_or(effect = 'allow') from matching), false)
      then true
    else public.has_platform_permission('platform.manage')
      and exists (
        select 1
        from public.current_platform_acting_context() pac
        where pac.condominium_id = target_condominium_id
      )
  end
$function$;
