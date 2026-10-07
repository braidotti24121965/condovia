-- H9.2: server-side acting context for platform administrators.

alter table public.audit_events drop constraint if exists audit_events_entity_type_check;
alter table public.audit_events add constraint audit_events_entity_type_check check (entity_type in (
  'user_invitation', 'condominium_membership', 'administrator_membership',
  'administrator_condominium_access', 'platform_membership', 'role_assignment',
  'permission_override', 'user_account', 'condominium', 'address',
  'condominium_structure', 'unit', 'person', 'person_document', 'person_email',
  'person_phone', 'person_condominium_link', 'unit_ownership', 'unit_occupancy',
  'unit_financial_responsibility', 'visitor', 'service_provider', 'access_point',
  'access_authorization', 'access_request', 'access_event', 'package',
  'package_collection', 'platform_acting_context'
));

create table public.platform_acting_contexts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  auth_session_id uuid not null references auth.sessions(id) on delete cascade,
  context_type text not null default 'condominium' check (context_type = 'condominium'),
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > started_at),
  check (ended_at is null or ended_at >= started_at)
);

create unique index platform_acting_contexts_one_open_session_idx
  on public.platform_acting_contexts(auth_session_id)
  where ended_at is null;
create index platform_acting_contexts_user_session_idx
  on public.platform_acting_contexts(auth_user_id, auth_session_id, started_at desc);
create index platform_acting_contexts_condominium_idx
  on public.platform_acting_contexts(condominium_id, started_at desc);

alter table public.platform_acting_contexts enable row level security;
revoke all on public.platform_acting_contexts from public, anon, authenticated;

create or replace function public.current_auth_session_id()
returns uuid
language sql stable security definer
set search_path = pg_catalog, public, auth
as $$
  select case
    when (auth.jwt() ->> 'session_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then (auth.jwt() ->> 'session_id')::uuid
    else null
  end
$$;
revoke all on function public.current_auth_session_id() from public, anon, authenticated;

create or replace function public.current_auth_session_is_valid()
returns boolean
language sql stable security definer
set search_path = pg_catalog, public, auth
as $$
  select public.current_auth_session_id() is not null
    and exists (
      select 1
      from auth.sessions s
      where s.id = public.current_auth_session_id()
        and s.user_id = (select auth.uid())
    )
$$;
revoke all on function public.current_auth_session_is_valid() from public, anon, authenticated;

create or replace function public.current_platform_acting_context()
returns table (id uuid, condominium_id uuid, expires_at timestamptz)
language sql stable security definer
set search_path = pg_catalog, public, auth
as $$
  select pac.id, pac.condominium_id, pac.expires_at
  from public.platform_acting_contexts pac
  join public.condominiums c on c.id = pac.condominium_id and c.status = 'active'
  where pac.auth_user_id = (select auth.uid())
    and pac.auth_session_id = public.current_auth_session_id()
    and pac.ended_at is null
    and pac.expires_at > now()
    and public.current_auth_session_is_valid()
$$;
revoke all on function public.current_platform_acting_context() from public, anon, authenticated;

create or replace function public.begin_platform_tenant_context(p_condominium_id uuid)
returns uuid
language plpgsql security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_auth_user_id uuid := (select auth.uid());
  v_session_id uuid := public.current_auth_session_id();
  v_account_id uuid;
  v_context_id uuid;
  v_event text := 'platform.tenant_context.enter';
begin
  if v_auth_user_id is null or v_session_id is null or not public.current_auth_session_is_valid() then
    raise exception 'Sessão inválida.' using errcode = '42501';
  end if;

  select ua.id into v_account_id
  from public.user_accounts ua
  where ua.auth_user_id = v_auth_user_id and ua.status = 'active';
  if v_account_id is null then raise exception 'Conta inválida.' using errcode = '42501'; end if;

  if not public.has_platform_permission('platform.manage') then
    raise exception 'Permissão de plataforma insuficiente.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.role_assignments ra
    join public.roles r on r.id = ra.role_id
    where ra.user_account_id = v_account_id and r.code = 'platform.admin'
      and r.status = 'active' and ra.platform_scope and ra.status = 'active'
      and ra.starts_at <= now() and (ra.ends_at is null or ra.ends_at > now())
  ) then raise exception 'Role de plataforma inválida.' using errcode = '42501'; end if;
  if not exists (select 1 from public.condominiums c where c.id = p_condominium_id and c.status = 'active') then
    raise exception 'Condomínio inválido ou inativo.' using errcode = '42501';
  end if;

  update public.platform_acting_contexts
  set ended_at = now()
  where auth_user_id = v_auth_user_id and auth_session_id = v_session_id and ended_at is null;
  if found then v_event := 'platform.tenant_context.switch'; end if;

  insert into public.platform_acting_contexts(auth_user_id, auth_session_id, condominium_id)
  values(v_auth_user_id, v_session_id, p_condominium_id)
  returning id into v_context_id;

  insert into public.audit_events(actor_auth_user_id, actor_user_account_id, event_type, entity_type, entity_id, metadata)
  values(v_auth_user_id, v_account_id, v_event, 'platform_acting_context', v_context_id,
    jsonb_build_object('auth_context','platform','acting_context_type','condominium','acting_context_id',v_context_id,'tenant_id',p_condominium_id));
  return v_context_id;
end
$$;
revoke all on function public.begin_platform_tenant_context(uuid) from public, anon;
grant execute on function public.begin_platform_tenant_context(uuid) to authenticated;

create or replace function public.end_platform_tenant_context()
returns boolean
language plpgsql security definer
set search_path = pg_catalog, public, auth
as $$
declare v_context public.platform_acting_contexts%rowtype; v_account_id uuid;
begin
  select pac.* into v_context
  from public.platform_acting_contexts pac
  where pac.auth_user_id = (select auth.uid())
    and pac.auth_session_id = public.current_auth_session_id()
    and pac.ended_at is null
  order by pac.started_at desc limit 1;
  if v_context.id is null then return false; end if;
  update public.platform_acting_contexts set ended_at = now() where id = v_context.id;
  select id into v_account_id from public.user_accounts where auth_user_id = (select auth.uid()) and status = 'active';
  insert into public.audit_events(actor_auth_user_id, actor_user_account_id, event_type, entity_type, entity_id, metadata)
  values((select auth.uid()), v_account_id, 'platform.tenant_context.exit', 'platform_acting_context', v_context.id,
    jsonb_build_object('auth_context','platform','acting_context_type','condominium','acting_context_id',v_context.id,'tenant_id',v_context.condominium_id));
  return true;
end
$$;
revoke all on function public.end_platform_tenant_context() from public, anon;
grant execute on function public.end_platform_tenant_context() to authenticated;

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
  select (
    public.has_condominium_access(target_condominium_id)
    and coalesce((select bool_and(effect <> 'deny') and bool_or(effect = 'allow') from matching), false)
  ) or (
    public.has_platform_permission('platform.manage')
    and exists (select 1 from public.current_platform_acting_context() pac where pac.condominium_id = target_condominium_id)
  )
$$;
revoke all on function public.has_permission(text, uuid) from public, anon;
grant execute on function public.has_permission(text, uuid) to authenticated;
