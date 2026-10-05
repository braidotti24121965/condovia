-- P4.5.8B.4D: platform administration, one-time bootstrap and tenant onboarding.

insert into public.permissions(code, description, scope) values
  ('platform.condominiums.read', 'Visualizar condomínios da plataforma', 'platform'),
  ('platform.condominiums.manage', 'Gerenciar condomínios da plataforma', 'platform'),
  ('platform.tenants.onboard', 'Criar tenants e convidar seu administrador inicial', 'platform')
on conflict (code) do update set description=excluded.description, scope=excluded.scope;

insert into public.role_permissions(role_id, permission_id)
select r.id, p.id
from public.roles r cross join public.permissions p
where r.code='platform.admin'
  and p.code in (
    'platform.manage', 'platform.clients.read', 'platform.clients.manage',
    'platform.condominiums.read', 'platform.condominiums.manage',
    'platform.tenants.onboard'
  )
on conflict do nothing;

create table public.platform_bootstrap_state (
  singleton boolean primary key default true check (singleton),
  user_account_id uuid not null unique references public.user_accounts(id) on delete restrict,
  completed_at timestamptz not null default now()
);
alter table public.platform_bootstrap_state enable row level security;
revoke all on public.platform_bootstrap_state from public, anon, authenticated;

create or replace function public.bootstrap_condo_master(p_auth_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  approved_email constant text := 'condomaster@kynoviabr.com.br';
  approved_name constant text := 'Condo Master';
  auth_email text;
  person_id uuid;
  account_id uuid;
  role_id uuid;
  state_account_id uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('condovia:platform-bootstrap', 45184));
  select pg_catalog.lower(pg_catalog.btrim(u.email)) into auth_email
  from auth.users u where u.id=p_auth_user_id;
  if auth_email is distinct from approved_email then
    raise exception 'Bootstrap identity is not approved.' using errcode='42501';
  end if;

  select s.user_account_id into state_account_id
  from public.platform_bootstrap_state s where s.singleton for update;
  if state_account_id is not null then
    if exists (
      select 1 from public.user_accounts ua
      join public.platform_memberships pm on pm.user_account_id=ua.id and pm.status='active'
      join public.role_assignments ra on ra.user_account_id=ua.id and ra.platform_scope and ra.status='active'
      join public.roles r on r.id=ra.role_id and r.code='platform.admin' and r.status='active'
      where ua.id=state_account_id and ua.auth_user_id=p_auth_user_id and ua.status='active'
    ) then return state_account_id; end if;
    raise exception 'Platform bootstrap state is inconsistent.' using errcode='55000';
  end if;
  if exists (
    select 1 from public.role_assignments ra join public.roles r on r.id=ra.role_id
    where ra.platform_scope and ra.status='active' and r.code='platform.admin'
  ) then raise exception 'Platform bootstrap was already performed.' using errcode='42501'; end if;

  select pe.person_id into person_id from public.person_emails pe
  where pe.normalized_email=approved_email limit 1;
  if person_id is null then
    insert into public.people(full_name,status) values(approved_name,'active') returning id into person_id;
    insert into public.person_emails(person_id,email,is_primary,is_verified,verified_at)
      values(person_id,approved_email,true,false,null);
  elsif exists(select 1 from public.person_emails pe where pe.normalized_email=approved_email and pe.person_id<>person_id) then
    raise exception 'Bootstrap email is ambiguous.' using errcode='23505';
  end if;

  select ua.id into account_id from public.user_accounts ua
  where ua.auth_user_id=p_auth_user_id or ua.person_id=person_id for update;
  if account_id is not null and not exists (
    select 1 from public.user_accounts ua
    where ua.id=account_id and ua.auth_user_id=p_auth_user_id and ua.person_id=person_id
  ) then raise exception 'Bootstrap identity conflicts with an existing account.' using errcode='23505'; end if;
  if account_id is null then
    insert into public.user_accounts(auth_user_id,person_id,status)
      values(p_auth_user_id,person_id,'active') returning id into account_id;
  else
    update public.user_accounts set status='active',updated_at=now() where id=account_id;
  end if;

  insert into public.platform_memberships(user_account_id,status)
    values(account_id,'active');
  select r.id into role_id from public.roles r where r.code='platform.admin' and r.status='active';
  if role_id is null then raise exception 'Platform admin role is unavailable.' using errcode='55000'; end if;
  insert into public.role_assignments(user_account_id,role_id,platform_scope,status)
    values(account_id,role_id,true,'active');
  insert into public.platform_bootstrap_state(singleton,user_account_id) values(true,account_id);
  insert into public.audit_events(event_type,entity_type,entity_id,metadata)
    values('platform.bootstrap_completed','user_account',account_id,
      pg_catalog.jsonb_build_object('email',approved_email,'role','platform.admin'));
  return account_id;
end
$$;
revoke all on function public.bootstrap_condo_master(uuid) from public, anon, authenticated;
grant execute on function public.bootstrap_condo_master(uuid) to service_role;

create policy clients_platform_read on public.clients for select to authenticated
  using (public.has_platform_permission('platform.clients.read'));
create policy condominiums_platform_read on public.condominiums for select to authenticated
  using (public.has_platform_permission('platform.condominiums.read'));

alter table public.user_invitations drop constraint user_invitations_type_check;
alter table public.user_invitations add constraint user_invitations_type_check
  check (invitation_type is null or invitation_type in ('condominium','condominium_admin','administrator','platform')) not valid;
alter table public.user_invitations drop constraint user_invitations_scope_check;
alter table public.user_invitations add constraint user_invitations_scope_check check (
  num_nonnulls(condominium_id,administrator_id,nullif(platform_scope,false)::boolean)<=1 and (
    invitation_type is null
    or (invitation_type in ('condominium','condominium_admin') and condominium_id is not null and administrator_id is null and not platform_scope)
    or (invitation_type='administrator' and administrator_id is not null and condominium_id is null and not platform_scope)
    or (invitation_type='platform' and platform_scope and condominium_id is null and administrator_id is null)
  )
) not valid;

create or replace function public.list_platform_tenants()
returns table(client_id uuid,client_legal_name text,client_status text,condominium_id uuid,condominium_name text,condominium_status text,condominium_type text,created_at timestamptz)
language plpgsql stable security definer set search_path=''
as $$
begin
  if not public.has_platform_permission('platform.condominiums.read') then
    raise exception 'Not authorized.' using errcode='42501';
  end if;
  return query select cl.id,cl.legal_name,cl.status,c.id,c.name,c.status,c.condominium_type,c.created_at
    from public.clients cl join public.condominiums c on c.client_id=cl.id
    order by c.created_at desc,c.name;
end
$$;
revoke all on function public.list_platform_tenants() from public, anon;
grant execute on function public.list_platform_tenants() to authenticated;

create or replace function public.create_tenant_with_initial_admin(
  p_client_legal_name text,
  p_condominium_name text,
  p_condominium_legal_name text,
  p_document_number text,
  p_condominium_email text,
  p_condominium_phone text,
  p_condominium_type text,
  p_timezone text,
  p_postal_code text,
  p_street text,
  p_number text,
  p_complement text,
  p_district text,
  p_city text,
  p_state text,
  p_country_code text,
  p_admin_name text,
  p_admin_email text,
  p_admin_phone text,
  p_token_hash text
)
returns table(condominium_id uuid, invitation_id uuid)
language plpgsql security definer set search_path=''
as $$
declare
  actor_id uuid:=public.current_user_account_id();
  new_client_id uuid;
  new_condominium_id uuid;
  new_address_id uuid;
  admin_person_id uuid;
  new_invitation_id uuid;
  normalized_admin_email text:=pg_catalog.lower(pg_catalog.btrim(pg_catalog.coalesce(p_admin_email,'')));
  normalized_document text:=pg_catalog.nullif(pg_catalog.regexp_replace(pg_catalog.coalesce(p_document_number,''),'[^0-9]','','g'),'');
  normalized_postal text:=pg_catalog.nullif(pg_catalog.regexp_replace(pg_catalog.coalesce(p_postal_code,''),'[^0-9]','','g'),'');
  has_address boolean:=pg_catalog.coalesce(pg_catalog.nullif(pg_catalog.btrim(p_street),''),pg_catalog.nullif(pg_catalog.btrim(p_city),''),pg_catalog.nullif(pg_catalog.btrim(p_state),''),normalized_postal) is not null;
begin
  if actor_id is null or not public.has_platform_permission('platform.tenants.onboard') then
    raise exception 'Not authorized.' using errcode='42501';
  end if;
  if pg_catalog.length(pg_catalog.btrim(pg_catalog.coalesce(p_client_legal_name,'')))=0
    or pg_catalog.length(pg_catalog.btrim(pg_catalog.coalesce(p_condominium_name,'')))=0
    or pg_catalog.length(pg_catalog.btrim(pg_catalog.coalesce(p_admin_name,'')))=0
    or normalized_admin_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid tenant onboarding data.' using errcode='22023';
  end if;
  if has_address and (pg_catalog.length(pg_catalog.btrim(pg_catalog.coalesce(p_street,'')))=0
    or pg_catalog.length(pg_catalog.btrim(pg_catalog.coalesce(p_city,'')))=0
    or pg_catalog.length(pg_catalog.btrim(pg_catalog.coalesce(p_state,'')))=0) then
    raise exception 'Street, city and state are required when an address is supplied.' using errcode='22023';
  end if;
  if normalized_postal is not null and pg_catalog.upper(pg_catalog.coalesce(pg_catalog.nullif(pg_catalog.btrim(p_country_code),''),'BR'))='BR'
    and normalized_postal !~ '^[0-9]{8}$' then
    raise exception 'Invalid Brazilian postal code.' using errcode='22023';
  end if;

  insert into public.clients(legal_name,status)
    values(pg_catalog.btrim(p_client_legal_name),'active') returning id into new_client_id;
  if has_address then
    insert into public.addresses(postal_code,street,number,complement,district,city,state,country_code)
    values(normalized_postal,pg_catalog.btrim(p_street),pg_catalog.nullif(pg_catalog.btrim(p_number),''),
      pg_catalog.nullif(pg_catalog.btrim(p_complement),''),pg_catalog.nullif(pg_catalog.btrim(p_district),''),
      pg_catalog.btrim(p_city),pg_catalog.btrim(p_state),pg_catalog.upper(pg_catalog.coalesce(pg_catalog.nullif(pg_catalog.btrim(p_country_code),''),'BR')))
    returning id into new_address_id;
  end if;
  insert into public.condominiums(client_id,name,legal_name,document_number,email,phone,condominium_type,address_id,timezone,status)
  values(new_client_id,pg_catalog.btrim(p_condominium_name),pg_catalog.nullif(pg_catalog.btrim(p_condominium_legal_name),''),
    normalized_document,pg_catalog.nullif(pg_catalog.lower(pg_catalog.btrim(p_condominium_email)),''),
    pg_catalog.nullif(pg_catalog.btrim(p_condominium_phone),''),pg_catalog.coalesce(pg_catalog.nullif(pg_catalog.btrim(p_condominium_type),''),'other'),
    new_address_id,pg_catalog.coalesce(pg_catalog.nullif(pg_catalog.btrim(p_timezone),''),'America/Sao_Paulo'),'active')
  returning id into new_condominium_id;

  select pe.person_id into admin_person_id from public.person_emails pe
    where pe.normalized_email=normalized_admin_email limit 1;
  if admin_person_id is null then
    insert into public.people(full_name,status) values(pg_catalog.btrim(p_admin_name),'active') returning id into admin_person_id;
    insert into public.person_emails(person_id,email,is_primary)
      values(admin_person_id,normalized_admin_email,true);
  elsif exists(select 1 from public.person_emails pe where pe.normalized_email=normalized_admin_email and pe.person_id<>admin_person_id) then
    raise exception 'Administrator email is ambiguous.' using errcode='23505';
  end if;
  if pg_catalog.nullif(pg_catalog.btrim(p_admin_phone),'') is not null then
    insert into public.person_phones(person_id,phone_e164,phone_type,is_primary)
      values(admin_person_id,pg_catalog.regexp_replace(p_admin_phone,'[^0-9+]','','g'),'mobile',true)
    on conflict(person_id,phone_e164) do nothing;
  end if;
  insert into public.person_condominium_links(person_id,condominium_id,status)
    values(admin_person_id,new_condominium_id,'active');
  insert into public.user_invitations(client_id,person_id,email,token_hash,status,expires_at,invited_by_user_account_id,invitation_type,condominium_id)
    values(new_client_id,admin_person_id,normalized_admin_email,p_token_hash,'pending',now()+interval '24 hours',actor_id,'condominium_admin',new_condominium_id)
    returning id into new_invitation_id;
  insert into public.audit_events(actor_auth_user_id,actor_user_account_id,event_type,entity_type,entity_id,metadata)
    values((select auth.uid()),actor_id,'tenant.onboarding_created','user_invitation',new_invitation_id,
      pg_catalog.jsonb_build_object('client_id',new_client_id,'condominium_id',new_condominium_id,'role','condominium.syndic'));
  return query select new_condominium_id,new_invitation_id;
end
$$;
revoke all on function public.create_tenant_with_initial_admin(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text) from public, anon;
grant execute on function public.create_tenant_with_initial_admin(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text) to authenticated;

create or replace function public.validate_role_assignment_actor()
returns trigger language plpgsql security definer set search_path=''
as $$
declare actor_id uuid:=public.current_user_account_id(); target_person_id uuid; allowed_invite boolean:=false;
begin
  if actor_id is not null and actor_id=new.user_account_id then
    if new.condominium_id is not null then
      select ua.person_id into target_person_id from public.user_accounts ua where ua.id=new.user_account_id;
      select exists(
        select 1 from public.user_invitations i join public.roles r on r.id=new.role_id
        where i.person_id=target_person_id and i.condominium_id=new.condominium_id
          and i.status='accepted' and i.accepted_at=transaction_timestamp()
          and ((i.invitation_type='condominium' and r.code='condominium.resident')
            or (i.invitation_type='condominium_admin' and r.code='condominium.syndic'))
      ) into allowed_invite;
      if not allowed_invite and not public.has_permission('roles.assign',new.condominium_id) then
        raise exception 'Not authorized to assign a role to self' using errcode='42501';
      end if;
    elsif new.administrator_id is not null and not public.has_administrator_permission('roles.assign',new.administrator_id) then
      raise exception 'Not authorized to assign a role to self' using errcode='42501';
    elsif new.platform_scope and not public.has_platform_permission('roles.assign') then
      raise exception 'Not authorized to assign a role to self' using errcode='42501';
    end if;
  end if;
  return new;
end
$$;
revoke all on function public.validate_role_assignment_actor() from public,anon,authenticated;

create or replace function public.accept_initial_condominium_admin_invitation(p_token text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare
  actor_auth_id uuid:=(select auth.uid()); auth_email text; invitation public.user_invitations%rowtype;
  account_id uuid; linked_person_id uuid; syndic_role_id uuid;
begin
  if actor_auth_id is null or p_token !~ '^[0-9a-f]{64}$' then raise exception 'Convite inválido ou expirado.' using errcode='42501'; end if;
  select pg_catalog.lower(u.email) into auth_email from auth.users u
    where u.id=actor_auth_id and u.email_confirmed_at is not null;
  if auth_email is null then raise exception 'Confirme o e-mail do convite antes de continuar.' using errcode='42501'; end if;
  select * into invitation from public.user_invitations i
    where i.token_hash=extensions.encode(extensions.digest(p_token,'sha256'),'hex') and i.status='pending' for update;
  if invitation.id is null or invitation.expires_at<=now() or invitation.invitation_type<>'condominium_admin' or invitation.email<>auth_email then
    raise exception 'Convite inválido ou expirado.' using errcode='42501';
  end if;
  if not exists(select 1 from public.people p join public.person_condominium_links l on l.person_id=p.id
    join public.person_emails e on e.person_id=p.id
    where p.id=invitation.person_id and p.status='active' and l.condominium_id=invitation.condominium_id
      and l.status='active' and e.normalized_email=auth_email) then
    raise exception 'Convite inválido ou expirado.' using errcode='42501';
  end if;
  select ua.id,ua.person_id into account_id,linked_person_id from public.user_accounts ua where ua.auth_user_id=actor_auth_id for update;
  if account_id is not null and linked_person_id<>invitation.person_id then raise exception 'Convite inválido ou expirado.' using errcode='42501'; end if;
  if account_id is null then
    select ua.id,ua.person_id into account_id,linked_person_id from public.user_accounts ua where ua.person_id=invitation.person_id for update;
    if account_id is not null then raise exception 'Convite inválido ou expirado.' using errcode='42501'; end if;
  end if;
  if account_id is not null and exists(select 1 from public.user_accounts ua where ua.id=account_id and ua.status in ('suspended','disabled','closed')) then
    raise exception 'A conta não pode ser ativada por este convite.' using errcode='42501';
  end if;
  if account_id is null then
    insert into public.user_accounts(auth_user_id,person_id,status) values(actor_auth_id,invitation.person_id,'invited') returning id into account_id;
  end if;
  if exists(select 1 from public.condominium_memberships m where m.user_account_id=account_id and m.condominium_id=invitation.condominium_id and m.status='suspended' and (m.ends_at is null or m.ends_at>now())) then
    raise exception 'A membership não pode ser reativada por este convite.' using errcode='42501';
  end if;
  update public.user_invitations set status='accepted',accepted_at=transaction_timestamp() where id=invitation.id;
  if not exists(select 1 from public.condominium_memberships m where m.user_account_id=account_id and m.condominium_id=invitation.condominium_id and m.status='active' and m.starts_at<=now() and (m.ends_at is null or m.ends_at>now())) then
    insert into public.condominium_memberships(condominium_id,user_account_id,status) values(invitation.condominium_id,account_id,'active');
  end if;
  select r.id into syndic_role_id from public.roles r where r.code='condominium.syndic' and r.status='active';
  if syndic_role_id is null then raise exception 'Role de síndico indisponível.' using errcode='55000'; end if;
  if not exists(select 1 from public.role_assignments ra where ra.user_account_id=account_id and ra.role_id=syndic_role_id and ra.condominium_id=invitation.condominium_id and ra.status='active') then
    insert into public.role_assignments(user_account_id,role_id,condominium_id,status) values(account_id,syndic_role_id,invitation.condominium_id,'active');
  end if;
  update public.user_accounts set status='active',updated_at=now() where id=account_id and status='invited';
  return invitation.condominium_id;
end
$$;
revoke all on function public.accept_initial_condominium_admin_invitation(text) from public, anon;
grant execute on function public.accept_initial_condominium_admin_invitation(text) to authenticated;

comment on function public.bootstrap_condo_master(uuid) is 'Service-role-only, idempotent singleton bootstrap for the approved first platform administrator.';
comment on function public.create_tenant_with_initial_admin(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text) is 'Atomically creates a client, condominium, initial syndic identity and hashed invitation after explicit platform authorization.';
comment on function public.accept_initial_condominium_admin_invitation(text) is 'Accepts only an initial condominium admin invitation and grants exactly condominium.syndic without residential relationships.';
