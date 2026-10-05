CREATE OR REPLACE FUNCTION public.bootstrap_condo_master(p_auth_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  approved_email constant text := 'condomaster@kynoviabr.com.br';
  approved_name constant text := 'Condo Master';
  auth_email text;
  bootstrap_person_id uuid;
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

  select pe.person_id into bootstrap_person_id from public.person_emails pe
  where pe.normalized_email=approved_email limit 1;
  if bootstrap_person_id is null then
    insert into public.people(full_name,status) values(approved_name,'active') returning id into bootstrap_person_id;
    insert into public.person_emails(person_id,email,is_primary,is_verified,verified_at)
      values(bootstrap_person_id,approved_email,true,false,null);
  elsif exists(select 1 from public.person_emails pe where pe.normalized_email=approved_email and pe.person_id<>bootstrap_person_id) then
    raise exception 'Bootstrap email is ambiguous.' using errcode='23505';
  end if;

  select ua.id into account_id from public.user_accounts ua
  where ua.auth_user_id=p_auth_user_id or ua.person_id=bootstrap_person_id for update;
  if account_id is not null and not exists (
    select 1 from public.user_accounts ua
    where ua.id=account_id and ua.auth_user_id=p_auth_user_id and ua.person_id=bootstrap_person_id
  ) then raise exception 'Bootstrap identity conflicts with an existing account.' using errcode='23505'; end if;
  if account_id is null then
    insert into public.user_accounts(auth_user_id,person_id,status)
      values(p_auth_user_id,bootstrap_person_id,'active') returning id into account_id;
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
$function$

