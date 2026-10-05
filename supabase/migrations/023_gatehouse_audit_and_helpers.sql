-- 023_gatehouse_audit_and_helpers.sql
-- Transactional Helper Functions, Presence Discovery, and Audit Logging for Gatehouse

-- 1. Expand audit_events entity_type check to include P4 entities
alter table public.audit_events drop constraint if exists audit_events_entity_type_check;
alter table public.audit_events add constraint audit_events_entity_type_check
  check (entity_type in (
    'user_invitation', 'condominium_membership', 'administrator_membership',
    'administrator_condominium_access', 'platform_membership', 'role_assignment',
    'permission_override', 'user_account', 'condominium', 'address',
    'condominium_structure', 'unit', 'person', 'person_document', 'person_email',
    'person_phone', 'person_condominium_link', 'unit_ownership', 'unit_occupancy',
    'unit_financial_responsibility',
    -- P4 entities
    'visitor', 'service_provider', 'access_point', 'access_authorization',
    'access_request', 'access_event', 'package', 'package_collection'
  ));

-- 2. Helper function: Record access entry with concurrency guard
create or replace function public.register_access_entry(
  p_condominium_id uuid,
  p_authorization_id uuid,
  p_access_point_id uuid,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_account_id uuid;
  v_auth record;
  v_point record;
  v_last_event text;
  v_event_id uuid;
begin
  v_user_account_id := public.current_user_account_id();
  if v_user_account_id is null then
    raise exception 'Acesso não autenticado';
  end if;

  if not (public.has_permission('gatehouse.operate', p_condominium_id) or public.has_permission('access_events.manage', p_condominium_id)) then
    raise exception 'Permissão negada para registrar entrada na portaria';
  end if;

  -- Validate access point
  select id, status into v_point
  from public.access_points
  where id = p_access_point_id and condominium_id = p_condominium_id;

  if not found or v_point.status != 'active' then
    raise exception 'Ponto de acesso inválido ou inativo';
  end if;

  -- Lock and validate authorization
  select id, condominium_id, unit_id, visitor_id, service_provider_id, status, valid_from, valid_until
  into v_auth
  from public.access_authorizations
  where id = p_authorization_id and condominium_id = p_condominium_id
  for share;

  if not found then
    raise exception 'Autorização não encontrada neste condomínio';
  end if;

  if v_auth.status != 'approved' then
    raise exception 'Autorização não está aprovada (status: %)', v_auth.status;
  end if;

  if now() < v_auth.valid_from then
    raise exception 'Autorização ainda não é válida (início: %)', v_auth.valid_from;
  end if;

  if now() > v_auth.valid_until then
    raise exception 'Autorização expirada (validade: %)', v_auth.valid_until;
  end if;

  -- Concurrency control: serialize entry checks per visitor or provider
  if v_auth.visitor_id is not null then
    perform pg_advisory_xact_lock(hashtext('gatehouse_person_' || v_auth.visitor_id::text));
    select event_type into v_last_event
    from public.access_events
    where condominium_id = p_condominium_id and visitor_id = v_auth.visitor_id
    order by occurred_at desc, sequence_number desc
    limit 1;
  else
    perform pg_advisory_xact_lock(hashtext('gatehouse_person_' || v_auth.service_provider_id::text));
    select event_type into v_last_event
    from public.access_events
    where condominium_id = p_condominium_id and service_provider_id = v_auth.service_provider_id
    order by occurred_at desc, sequence_number desc
    limit 1;
  end if;

  if v_last_event = 'entry' then
    raise exception 'Acesso duplicado rejeitado: a pessoa já consta dentro do condomínio';
  end if;

  -- Insert entry event
  insert into public.access_events (
    condominium_id, access_point_id, visitor_id, service_provider_id,
    authorization_id, unit_id, event_type, occurred_at, recorded_by_user_account_id, notes
  ) values (
    p_condominium_id, p_access_point_id, v_auth.visitor_id, v_auth.service_provider_id,
    v_auth.id, v_auth.unit_id, 'entry', clock_timestamp(), v_user_account_id, p_notes
  )
  returning id into v_event_id;

  -- Audit log
  insert into public.audit_events (
    actor_auth_user_id, actor_user_account_id, event_type,
    entity_type, entity_id, metadata
  ) values (
    auth.uid(), v_user_account_id, 'gatehouse.entry',
    'access_event', v_event_id,
    jsonb_build_object(
      'condominium_id', p_condominium_id,
      'authorization_id', v_auth.id,
      'unit_id', v_auth.unit_id,
      'event_id', v_event_id
    )
  );

  return v_event_id;
end;
$$;

-- 3. Helper function: Record access exit
create or replace function public.register_access_exit(
  p_condominium_id uuid,
  p_visitor_id uuid,
  p_service_provider_id uuid,
  p_access_point_id uuid,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_account_id uuid;
  v_point record;
  v_last_event record;
  v_event_id uuid;
begin
  v_user_account_id := public.current_user_account_id();
  if v_user_account_id is null then
    raise exception 'Acesso não autenticado';
  end if;

  if not (public.has_permission('gatehouse.operate', p_condominium_id) or public.has_permission('access_events.manage', p_condominium_id)) then
    raise exception 'Permissão negada para registrar saída na portaria';
  end if;

  if (p_visitor_id is null and p_service_provider_id is null) or (p_visitor_id is not null and p_service_provider_id is not null) then
    raise exception 'Informe exatamente um visitante ou prestador';
  end if;

  select id, status into v_point
  from public.access_points
  where id = p_access_point_id and condominium_id = p_condominium_id;

  if not found or v_point.status != 'active' then
    raise exception 'Ponto de acesso inválido ou inativo';
  end if;

  if p_visitor_id is not null then
    perform pg_advisory_xact_lock(hashtext('gatehouse_person_' || p_visitor_id::text));
    select id, event_type, authorization_id, unit_id into v_last_event
    from public.access_events
    where condominium_id = p_condominium_id and visitor_id = p_visitor_id
    order by occurred_at desc, sequence_number desc
    limit 1;
  else
    perform pg_advisory_xact_lock(hashtext('gatehouse_person_' || p_service_provider_id::text));
    select id, event_type, authorization_id, unit_id into v_last_event
    from public.access_events
    where condominium_id = p_condominium_id and service_provider_id = p_service_provider_id
    order by occurred_at desc, sequence_number desc
    limit 1;
  end if;

  if v_last_event is null or v_last_event.event_type != 'entry' then
    raise exception 'Saída inválida: a pessoa não consta dentro do condomínio';
  end if;

  insert into public.access_events (
    condominium_id, access_point_id, visitor_id, service_provider_id,
    authorization_id, unit_id, event_type, occurred_at, recorded_by_user_account_id, notes
  ) values (
    p_condominium_id, p_access_point_id, p_visitor_id, p_service_provider_id,
    v_last_event.authorization_id, v_last_event.unit_id, 'exit', clock_timestamp(), v_user_account_id, p_notes
  )
  returning id into v_event_id;

  -- Audit log
  insert into public.audit_events (
    actor_auth_user_id, actor_user_account_id, event_type,
    entity_type, entity_id, metadata
  ) values (
    auth.uid(), v_user_account_id, 'gatehouse.exit',
    'access_event', v_event_id,
    jsonb_build_object(
      'condominium_id', p_condominium_id,
      'authorization_id', v_last_event.authorization_id,
      'event_id', v_event_id
    )
  );

  return v_event_id;
end;
$$;

-- 4. Presence function: derive "Dentro agora" from latest event
create or replace function public.get_gatehouse_presence(p_condominium_id uuid)
returns table (
  target_kind text,
  target_id uuid,
  full_name text,
  document_type text,
  document_number text,
  company_name text,
  unit_id uuid,
  unit_code text,
  authorization_id uuid,
  access_point_id uuid,
  access_point_name text,
  entered_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  with latest_events as (
    select distinct on (coalesce(ae.visitor_id, ae.service_provider_id))
      ae.id,
      ae.condominium_id,
      ae.visitor_id,
      ae.service_provider_id,
      ae.authorization_id,
      ae.access_point_id,
      ae.unit_id,
      ae.event_type,
      ae.occurred_at
    from public.access_events ae
    where ae.condominium_id = p_condominium_id
      and (
        public.has_permission('gatehouse.read', p_condominium_id) or
        public.has_permission('gatehouse.operate', p_condominium_id)
      )
    order by coalesce(ae.visitor_id, ae.service_provider_id), ae.occurred_at desc, ae.sequence_number desc
  )
  select
    case when le.visitor_id is not null then 'visitor' else 'provider' end as target_kind,
    coalesce(le.visitor_id, le.service_provider_id) as target_id,
    coalesce(v.full_name, sp.full_name) as full_name,
    coalesce(v.document_type, sp.document_type) as document_type,
    coalesce(v.document_number, sp.document_number) as document_number,
    sp.company_name,
    le.unit_id,
    u.code as unit_code,
    le.authorization_id,
    le.access_point_id,
    ap.name as access_point_name,
    le.occurred_at as entered_at
  from latest_events le
  join public.units u on u.id = le.unit_id
  join public.access_points ap on ap.id = le.access_point_id
  left join public.visitors v on v.id = le.visitor_id
  left join public.service_providers sp on sp.id = le.service_provider_id
  where le.event_type = 'entry'
  order by le.occurred_at desc;
$$;

-- 5. Decide access request: approve or deny
create or replace function public.decide_access_request(
  p_request_id uuid,
  p_decision text,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_account_id uuid;
  v_person_id uuid;
  v_req record;
  v_auth_id uuid;
begin
  v_user_account_id := public.current_user_account_id();
  v_person_id := public.current_person_id();
  if v_user_account_id is null then
    raise exception 'Acesso não autenticado';
  end if;

  if p_decision not in ('approved', 'denied') then
    raise exception 'Decisão inválida: deve ser approved ou denied';
  end if;

  select * into v_req
  from public.access_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Solicitação de acesso não encontrada';
  end if;

  if v_req.status != 'pending' then
    raise exception 'Solicitação já foi decidida anteriormente';
  end if;

  -- Caller must be authorized for this condominium and unit
  if not (
    public.has_permission('access_authorizations.manage', v_req.condominium_id) or
    public.is_unit_eligible_for_resident(v_req.unit_id, v_req.condominium_id)
  ) then
    raise exception 'Permissão negada para decidir esta solicitação';
  end if;

  if p_decision = 'approved' then
    -- Generate corresponding authorization valid until end of current day (or next 12h)
    insert into public.access_authorizations (
      condominium_id, unit_id, visitor_id, service_provider_id,
      authorized_by_person_id, authorized_by_user_account_id,
      source_request_id, valid_from, valid_until, status, notes, approved_at
    ) values (
      v_req.condominium_id, v_req.unit_id, v_req.visitor_id, v_req.service_provider_id,
      coalesce(v_person_id, (select id from public.people where id = (select person_id from public.user_accounts where id = v_user_account_id))),
      v_user_account_id,
      v_req.id,
      now(),
      date_trunc('day', now()) + interval '1 day 04:00:00',
      'approved',
      p_notes,
      now()
    )
    returning id into v_auth_id;

    update public.access_requests
    set status = 'approved',
        decided_by_person_id = v_person_id,
        decided_by_user_account_id = v_user_account_id,
        decided_at = now(),
        updated_at = now()
    where id = v_req.id;
  else
    update public.access_requests
    set status = 'denied',
        decided_by_person_id = v_person_id,
        decided_by_user_account_id = v_user_account_id,
        decided_at = now(),
        notes = coalesce(p_notes, notes),
        updated_at = now()
    where id = v_req.id;
  end if;

  -- Audit decision
  insert into public.audit_events (
    actor_auth_user_id, actor_user_account_id, event_type,
    entity_type, entity_id, metadata
  ) values (
    auth.uid(), v_user_account_id, 'gatehouse.request_' || p_decision,
    'access_request', v_req.id,
    jsonb_build_object(
      'condominium_id', v_req.condominium_id,
      'decision', p_decision,
      'authorization_id', v_auth_id
    )
  );

  return v_auth_id;
end;
$$;

-- 6. Package collection with atomic concurrency guard
create or replace function public.collect_package(
  p_package_id uuid,
  p_collected_by_person_id uuid default null,
  p_collector_name text default null,
  p_collector_document text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_account_id uuid;
  v_pkg record;
  v_collection_id uuid;
begin
  v_user_account_id := public.current_user_account_id();
  if v_user_account_id is null then
    raise exception 'Acesso não autenticado';
  end if;

  select * into v_pkg
  from public.packages
  where id = p_package_id
  for update;

  if not found then
    raise exception 'Encomenda não encontrada';
  end if;

  if not public.has_permission('packages.manage', v_pkg.condominium_id) then
    raise exception 'Permissão negada para liberar encomendas';
  end if;

  if v_pkg.status = 'collected' then
    raise exception 'Segunda retirada rejeitada: encomenda já foi retirada anteriormente';
  end if;

  update public.packages
  set status = 'collected', updated_at = now()
  where id = v_pkg.id;

  insert into public.package_collections (
    package_id, condominium_id, collected_at, collected_by_person_id,
    collector_name, collector_document, released_by_user_account_id, notes
  ) values (
    v_pkg.id, v_pkg.condominium_id, now(), p_collected_by_person_id,
    p_collector_name, p_collector_document, v_user_account_id, p_notes
  )
  returning id into v_collection_id;

  -- Audit log
  insert into public.audit_events (
    actor_auth_user_id, actor_user_account_id, event_type,
    entity_type, entity_id, metadata
  ) values (
    auth.uid(), v_user_account_id, 'gatehouse.package_collected',
    'package', v_pkg.id,
    jsonb_build_object(
      'condominium_id', v_pkg.condominium_id,
      'collection_id', v_collection_id,
      'package_id', v_pkg.id
    )
  );

  return v_collection_id;
end;
$$;

-- 7. Resident-safe visitor authorization and recent visitors.
create or replace function public.get_resident_recent_visitors()
returns table (id uuid, full_name text)
language sql
security definer
set search_path = ''
stable
as $$
  select distinct v.id, v.full_name
  from public.access_authorizations a
  join public.visitors v on v.id = a.visitor_id and v.condominium_id = a.condominium_id
  where (select auth.uid()) is not null
    and public.has_condominium_access(a.condominium_id)
    and public.is_unit_eligible_for_resident(a.unit_id, a.condominium_id)
  order by v.full_name;
$$;

create or replace function public.create_resident_visitor_authorization(
  p_unit_id uuid,
  p_valid_from timestamptz,
  p_valid_until timestamptz,
  p_visitor_id uuid default null,
  p_full_name text default null,
  p_document_type text default null,
  p_document_number text default null,
  p_phone text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account_id uuid;
  v_person_id uuid;
  v_condominium_id uuid;
  v_visitor_id uuid;
  v_authorization_id uuid;
  v_name text := pg_catalog.btrim(coalesce(p_full_name, ''));
  v_document_type text := nullif(pg_catalog.lower(pg_catalog.btrim(coalesce(p_document_type, ''))), '');
  v_document_number text := nullif(pg_catalog.upper(pg_catalog.regexp_replace(coalesce(p_document_number, ''), '[^0-9A-Za-z]', '', 'g')), '');
  v_phone text := nullif(pg_catalog.btrim(coalesce(p_phone, '')), '');
begin
  if (select auth.uid()) is null then
    raise exception 'Acesso não autenticado' using errcode = '42501';
  end if;

  select ua.id, ua.person_id into v_account_id, v_person_id
  from public.user_accounts ua
  where ua.auth_user_id = (select auth.uid()) and ua.status = 'active';
  if v_account_id is null then
    raise exception 'Conta ativa não encontrada' using errcode = '42501';
  end if;

  select u.condominium_id into v_condominium_id
  from public.units u where u.id = p_unit_id and u.operational_status <> 'inactive';
  if v_condominium_id is null
     or not public.has_condominium_access(v_condominium_id)
     or not public.is_unit_eligible_for_resident(p_unit_id, v_condominium_id) then
    raise exception 'Unidade não autorizada' using errcode = '42501';
  end if;
  if p_valid_from is null or p_valid_until is null or p_valid_from >= p_valid_until then
    raise exception 'Período de validade inválido' using errcode = '22023';
  end if;

  if p_visitor_id is not null then
    select v.id into v_visitor_id
    from public.visitors v
    where v.id = p_visitor_id and v.condominium_id = v_condominium_id and v.status = 'active'
      and exists (
        select 1 from public.access_authorizations prior
        where prior.visitor_id = v.id and prior.condominium_id = v_condominium_id
          and public.is_unit_eligible_for_resident(prior.unit_id, prior.condominium_id)
      );
    if v_visitor_id is null then
      raise exception 'Visitante recente não autorizado' using errcode = '42501';
    end if;
  else
    if pg_catalog.length(v_name) < 2 then
      raise exception 'Informe o nome do visitante' using errcode = '22023';
    end if;
    if v_document_type is not null and v_document_type not in ('cpf','rg','cnh','passport','other') then
      raise exception 'Tipo de documento inválido' using errcode = '22023';
    end if;
    if v_document_number is not null and v_document_type is null then
      raise exception 'Informe o tipo do documento' using errcode = '22023';
    end if;

    if v_document_number is not null then
      perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_condominium_id::text || ':' || v_document_type || ':' || v_document_number, 451));
      select v.id into v_visitor_id from public.visitors v
      where v.condominium_id = v_condominium_id
        and v.document_type = v_document_type
        and pg_catalog.upper(pg_catalog.regexp_replace(coalesce(v.document_number, ''), '[^0-9A-Za-z]', '', 'g')) = v_document_number
      order by v.created_at limit 1;
    end if;

    if v_visitor_id is null then
      insert into public.visitors (condominium_id, full_name, document_type, document_number, phone, created_by, updated_by)
      values (v_condominium_id, v_name, v_document_type, v_document_number, v_phone, v_account_id, v_account_id)
      returning id into v_visitor_id;
    end if;
  end if;

  insert into public.access_authorizations (
    condominium_id, unit_id, visitor_id, authorized_by_person_id,
    authorized_by_user_account_id, valid_from, valid_until, status, notes, approved_at
  ) values (
    v_condominium_id, p_unit_id, v_visitor_id, v_person_id,
    v_account_id, p_valid_from, p_valid_until, 'approved', p_notes, pg_catalog.now()
  ) returning id into v_authorization_id;

  insert into public.audit_events (
    actor_auth_user_id, actor_user_account_id, event_type, entity_type, entity_id, metadata
  ) values (
    (select auth.uid()), v_account_id, 'gatehouse.resident_authorization_created',
    'access_authorization', v_authorization_id,
    pg_catalog.jsonb_build_object('condominium_id', v_condominium_id, 'unit_id', p_unit_id)
  );
  return v_authorization_id;
end;
$$;

-- 8. Grants on helper functions
create or replace function public.get_gatehouse_units(p_condominium_id uuid)
returns table (id uuid, code text, display_name text, unit_type text)
language sql
security definer
set search_path = ''
stable
as $$
  select u.id, u.code, u.display_name, u.unit_type
  from public.units u
  where u.condominium_id = p_condominium_id
    and u.operational_status <> 'inactive'
    and (
      public.has_permission('gatehouse.read', p_condominium_id) or
      public.has_permission('gatehouse.operate', p_condominium_id)
    )
  order by u.code;
$$;

revoke all on function public.register_access_entry(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.register_access_entry(uuid, uuid, uuid, text) to authenticated;

revoke all on function public.register_access_exit(uuid, uuid, uuid, uuid, text) from public, anon;
grant execute on function public.register_access_exit(uuid, uuid, uuid, uuid, text) to authenticated;

revoke all on function public.get_gatehouse_presence(uuid) from public, anon;
grant execute on function public.get_gatehouse_presence(uuid) to authenticated;

revoke all on function public.get_gatehouse_units(uuid) from public, anon;
grant execute on function public.get_gatehouse_units(uuid) to authenticated;

revoke all on function public.decide_access_request(uuid, text, text) from public, anon;
grant execute on function public.decide_access_request(uuid, text, text) to authenticated;

revoke all on function public.collect_package(uuid, uuid, text, text, text) from public, anon;
grant execute on function public.collect_package(uuid, uuid, text, text, text) to authenticated;

revoke all on function public.get_resident_recent_visitors() from public, anon;
grant execute on function public.get_resident_recent_visitors() to authenticated;

revoke all on function public.create_resident_visitor_authorization(uuid, timestamptz, timestamptz, uuid, text, text, text, text, text) from public, anon;
grant execute on function public.create_resident_visitor_authorization(uuid, timestamptz, timestamptz, uuid, text, text, text, text, text) to authenticated;
