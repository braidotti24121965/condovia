-- P3.7: complete the existing P1 invitation path and allow audited contact edits.
-- The only elevated Auth operation (sending the Supabase invite) remains in the
-- Next.js server action. Invitation tokens are hashed before they reach Postgres.

-- Make the approved P3 audit SELECT policy usable by the dossier. Actor IDs
-- remain unavailable; RLS still filters all rows and no write grant is added.
grant select (id, event_type, entity_type, entity_id, metadata, created_at)
  on public.audit_events to authenticated;

insert into public.role_permissions(role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code = 'users.invite'
where r.code in ('condominium.syndic', 'condominium.manager')
on conflict do nothing;

create or replace function public.issue_resident_invitation(
  p_person_id uuid,
  p_condominium_id uuid,
  p_email text,
  p_token_hash text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := public.current_user_account_id();
  v_normalized_email text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_email, '')));
  invitation_id uuid;
  local_today date;
begin
  if (select auth.uid()) is null or actor_id is null
     or not public.has_permission('users.invite', p_condominium_id) then
    raise exception 'Não foi possível iniciar o convite.' using errcode = '42501';
  end if;
  if v_normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or pg_catalog.length(v_normalized_email) > 254
     or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Não foi possível iniciar o convite.' using errcode = '22023';
  end if;
  select pg_catalog.timezone(c.timezone, pg_catalog.now())::date into local_today
    from public.condominiums c where c.id = p_condominium_id and c.status = 'active';
  if local_today is null
     or not exists (
       select 1 from public.people p
       join public.person_condominium_links l on l.person_id = p.id
       where p.id = p_person_id and p.status = 'active'
         and l.condominium_id = p_condominium_id and l.status = 'active'
     )
     or not exists (
       select 1 from public.person_emails e
       where e.person_id = p_person_id
         and e.normalized_email = v_normalized_email
     )
     or not (
       exists (select 1 from public.unit_ownerships o
         where o.person_id = p_person_id and o.condominium_id = p_condominium_id
           and (o.ends_at is null or o.ends_at > local_today))
       or exists (select 1 from public.unit_occupancies o
         where o.person_id = p_person_id and o.condominium_id = p_condominium_id
           and (o.ends_at is null or o.ends_at > local_today))
     ) then
    raise exception 'Não foi possível iniciar o convite.' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_person_id::text || ':' || p_condominium_id::text, 1515)
  );
  update public.user_invitations
    set status = 'revoked'
    where person_id = p_person_id and condominium_id = p_condominium_id
      and invitation_type = 'condominium' and status = 'pending';

  insert into public.user_invitations(
    client_id, person_id, email, token_hash, expires_at, invited_by_user_account_id,
    invitation_type, condominium_id, administrator_id, platform_scope
  )
    select c.client_id, p_person_id, v_normalized_email, p_token_hash,
         pg_catalog.now() + interval '7 days', actor_id,
         'condominium', c.id, null, false
  from public.condominiums c
  where c.id = p_condominium_id
  returning id into invitation_id;
  if invitation_id is null then
    raise exception 'Não foi possível iniciar o convite.' using errcode = '42501';
  end if;
  return invitation_id;
end
$$;
revoke all on function public.issue_resident_invitation(uuid, uuid, text, text) from public, anon;
grant execute on function public.issue_resident_invitation(uuid, uuid, text, text) to authenticated;

create or replace function public.cancel_resident_invitation(p_invitation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare changed integer;
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.user_invitations i
    where i.id=p_invitation_id and i.invited_by_user_account_id=public.current_user_account_id()
      and i.status='pending' and public.has_permission('users.invite',i.condominium_id)
  ) then return false; end if;
  update public.user_invitations set status='revoked' where id=p_invitation_id and status='pending';
  get diagnostics changed = row_count;
  return changed=1;
end
$$;
revoke all on function public.cancel_resident_invitation(uuid) from public, anon;
grant execute on function public.cancel_resident_invitation(uuid) to authenticated;

-- A resident role can be self-assigned only as part of the same transaction
-- that accepts a matching, unexpired condominium invitation. Ordinary direct
-- self-assignment continues to require roles.assign.
create or replace function public.validate_role_assignment_actor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := public.current_user_account_id();
  target_person_id uuid;
  resident_role_id uuid;
  accepted_invitation boolean := false;
begin
  if actor_id is not null and actor_id = new.user_account_id then
    if new.condominium_id is not null then
      select person_id into target_person_id from public.user_accounts where id = new.user_account_id;
      select id into resident_role_id from public.roles where code = 'condominium.resident';
      select exists (
        select 1 from public.user_invitations i
        join auth.users au on pg_catalog.lower(au.email) = i.email
        where i.person_id = target_person_id
          and i.condominium_id = new.condominium_id
          and i.invitation_type = 'condominium'
          and i.status = 'accepted'
          and i.accepted_at = transaction_timestamp()
          and au.id = (select auth.uid())
          and new.role_id = resident_role_id
          and new.administrator_id is null and not new.platform_scope
      ) into accepted_invitation;
      if not accepted_invitation and not public.has_permission('roles.assign', new.condominium_id) then
        raise exception 'Not authorized to assign a role to self' using errcode = '42501';
      end if;
    elsif new.administrator_id is not null
      and not public.has_administrator_permission('roles.assign', new.administrator_id) then
      raise exception 'Not authorized to assign a role to self' using errcode = '42501';
    elsif new.platform_scope and not public.has_platform_permission('roles.assign') then
      raise exception 'Not authorized to assign a role to self' using errcode = '42501';
    end if;
  end if;
  return new;
end
$$;
revoke all on function public.validate_role_assignment_actor() from public, anon, authenticated;

create or replace function public.accept_resident_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_auth_id uuid := (select auth.uid());
  auth_email text;
  accepted_condominium_id uuid;
  invitation public.user_invitations%rowtype;
  account_id uuid;
  other_person_id uuid;
  resident_role_id uuid;
begin
  if actor_auth_id is null or p_token !~ '^[0-9a-f]{64}$' then
    raise exception 'Convite inválido ou expirado.' using errcode = '42501';
  end if;
  select pg_catalog.lower(u.email) into auth_email from auth.users u
    where u.id = actor_auth_id and u.email_confirmed_at is not null;
  if auth_email is null then
    raise exception 'Confirme o e-mail do convite antes de continuar.' using errcode = '42501';
  end if;
  select * into invitation from public.user_invitations i
    where i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
      and i.status = 'pending' for update;
  if invitation.id is null or invitation.expires_at <= now()
     or invitation.invitation_type <> 'condominium'
     or invitation.email <> auth_email then
    raise exception 'Convite inválido ou expirado.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.people p
    join public.person_condominium_links l on l.person_id = p.id
    where p.id = invitation.person_id and p.status = 'active'
      and l.condominium_id = invitation.condominium_id and l.status = 'active'
      and exists (select 1 from public.person_emails e
        where e.person_id = p.id and e.normalized_email = auth_email)
      and (
        exists (select 1 from public.unit_ownerships o where o.person_id=p.id
          and o.condominium_id=invitation.condominium_id
          and (o.ends_at is null or o.ends_at > timezone((select c.timezone from public.condominiums c where c.id=invitation.condominium_id),now())::date))
        or exists (select 1 from public.unit_occupancies o where o.person_id=p.id
          and o.condominium_id=invitation.condominium_id
          and (o.ends_at is null or o.ends_at > timezone((select c.timezone from public.condominiums c where c.id=invitation.condominium_id),now())::date))
      )
  ) then
    raise exception 'Convite inválido ou expirado.' using errcode = '42501';
  end if;

  select ua.id, ua.person_id into account_id, other_person_id
    from public.user_accounts ua where ua.auth_user_id = actor_auth_id for update;
  if account_id is not null and other_person_id <> invitation.person_id then
    raise exception 'Convite inválido ou expirado.' using errcode = '42501';
  end if;
  if account_id is null then
    select ua.id, ua.auth_user_id into account_id, other_person_id
      from public.user_accounts ua where ua.person_id = invitation.person_id for update;
    if account_id is not null and other_person_id::text <> actor_auth_id::text then
      raise exception 'Convite inválido ou expirado.' using errcode = '42501';
    end if;
  end if;
  if account_id is not null and exists (
    select 1 from public.user_accounts ua where ua.id=account_id and ua.status in ('suspended','disabled','closed')
  ) then
    raise exception 'A conta não pode ser ativada por este convite.' using errcode = '42501';
  end if;
  if account_id is null then
    insert into public.user_accounts(auth_user_id, person_id, status)
      values(actor_auth_id, invitation.person_id, 'invited') returning id into account_id;
  end if;

  -- Mark accepted in this transaction so the role-assignment guard can verify
  -- the one-use invite capability. A failed provision rolls this state back.
  update public.user_invitations set status='accepted', accepted_at=transaction_timestamp()
    where id=invitation.id;

  if exists (select 1 from public.condominium_memberships m
    where m.user_account_id=account_id and m.condominium_id=invitation.condominium_id
      and m.status='suspended' and (m.ends_at is null or m.ends_at>now())) then
    raise exception 'A membership não pode ser reativada por este convite.' using errcode='42501';
  end if;
  if not exists (select 1 from public.condominium_memberships m
    where m.user_account_id=account_id and m.condominium_id=invitation.condominium_id
      and m.status='active' and m.starts_at<=now() and (m.ends_at is null or m.ends_at>now())) then
    insert into public.condominium_memberships(condominium_id,user_account_id,status,starts_at)
      values(invitation.condominium_id,account_id,'active',now());
  end if;
  select id into resident_role_id from public.roles where code='condominium.resident' and status='active';
  if resident_role_id is null then raise exception 'Role residente indisponível.' using errcode='55000'; end if;
  if not exists (select 1 from public.role_assignments ra where ra.user_account_id=account_id
    and ra.role_id=resident_role_id and ra.condominium_id=invitation.condominium_id
    and ra.status='active' and ra.starts_at<=now() and (ra.ends_at is null or ra.ends_at>now())) then
    insert into public.role_assignments(user_account_id,role_id,condominium_id,status,starts_at)
      values(account_id,resident_role_id,invitation.condominium_id,'active',now());
  end if;
  update public.user_accounts set status='active' where id=account_id and status='invited';
  accepted_condominium_id := invitation.condominium_id;
  return accepted_condominium_id;
end
$$;
revoke all on function public.accept_resident_invitation(text) from public, anon;
grant execute on function public.accept_resident_invitation(text) to authenticated;

create or replace function public.save_person_contact(
  p_person_id uuid,
  p_condominium_id uuid,
  p_contact_type text,
  p_contact_id uuid,
  p_value text,
  p_kind text,
  p_is_primary boolean,
  p_is_whatsapp boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  contact_id uuid := p_contact_id;
  normalized_value text := pg_catalog.btrim(coalesce(p_value, ''));
begin
  if (select auth.uid()) is null
     or not public.has_permission('people.manage', p_condominium_id)
     or not exists (select 1 from public.people p join public.person_condominium_links l on l.person_id=p.id
       where p.id=p_person_id and p.status='active' and l.condominium_id=p_condominium_id and l.status='active') then
    raise exception 'Operação não permitida.' using errcode='42501';
  end if;
  if p_contact_type='email' then
    normalized_value := pg_catalog.lower(normalized_value);
    if normalized_value !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or pg_catalog.length(normalized_value)>254 then
      raise exception 'Informe um e-mail válido.' using errcode='22023';
    end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_person_id::text||':email',1515));
    if p_is_primary then update public.person_emails set is_primary=false where person_id=p_person_id and is_primary and id is distinct from contact_id; end if;
    if contact_id is null then
      select id into contact_id from public.person_emails where person_id=p_person_id and normalized_email=normalized_value;
    end if;
    if contact_id is null then
      insert into public.person_emails(person_id,email,is_primary,is_verified,verified_at)
        values(p_person_id,normalized_value,p_is_primary,false,null) returning id into contact_id;
    else
      update public.person_emails set email=normalized_value,is_primary=p_is_primary,is_verified=false,verified_at=null
        where id=contact_id and person_id=p_person_id;
      if not found then raise exception 'Contato não encontrado.' using errcode='42501'; end if;
    end if;
  elsif p_contact_type='phone' then
    if normalized_value !~ '^\+[1-9][0-9]{6,14}$' then
      raise exception 'Informe um telefone em formato internacional válido.' using errcode='22023';
    end if;
    if p_kind not in ('mobile','landline','work','other') then raise exception 'Tipo de telefone inválido.' using errcode='22023'; end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_person_id::text||':phone',1515));
    if p_is_primary then update public.person_phones set is_primary=false where person_id=p_person_id and is_primary and id is distinct from contact_id; end if;
    if contact_id is null then
      select id into contact_id from public.person_phones where person_id=p_person_id and phone_e164=normalized_value;
    end if;
    if contact_id is null then
      insert into public.person_phones(person_id,phone_e164,phone_type,is_whatsapp,is_primary,is_verified,verified_at)
        values(p_person_id,normalized_value,p_kind,p_is_whatsapp,p_is_primary,false,null) returning id into contact_id;
    else
      update public.person_phones set phone_e164=normalized_value,phone_type=p_kind,is_whatsapp=p_is_whatsapp,is_primary=p_is_primary,is_verified=false,verified_at=null
        where id=contact_id and person_id=p_person_id;
      if not found then raise exception 'Contato não encontrado.' using errcode='42501'; end if;
    end if;
  else
    raise exception 'Tipo de contato inválido.' using errcode='22023';
  end if;
  return contact_id;
end
$$;
revoke all on function public.save_person_contact(uuid,uuid,text,uuid,text,text,boolean,boolean) from public, anon;
grant execute on function public.save_person_contact(uuid,uuid,text,uuid,text,text,boolean,boolean) to authenticated;

comment on function public.issue_resident_invitation(uuid,uuid,text,text) is
  'Creates a tenant-scoped P1 user_invitation only for an active linked person with an ownership or occupancy relationship; stores only a token hash.';
comment on function public.accept_resident_invitation(text) is
  'Consumes a one-use P1 invitation after confirmed-email authentication and atomically creates/reuses account, membership, and condominium.resident role.';
comment on function public.save_person_contact(uuid,uuid,text,uuid,text,text,boolean,boolean) is
  'Tenant-authorized, audited create/update for existing person_emails/person_phones; no delete and no duplicated contact columns.';
comment on function public.cancel_resident_invitation(uuid) is
  'Revokes only a pending invitation issued by the current authorized account in the same condominium.';
