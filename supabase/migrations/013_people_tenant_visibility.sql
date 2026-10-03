-- P3: tenant-scoped person visibility and controlled identity resolution.
create table public.person_condominium_links (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  person_id uuid not null references public.people(id) on delete restrict,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (condominium_id, person_id),
  unique (person_id, condominium_id)
);
create index person_condominium_links_person_idx on public.person_condominium_links(person_id, status);
create index person_condominium_links_condo_idx on public.person_condominium_links(condominium_id, status, person_id);
create trigger person_condominium_links_updated_at before update on public.person_condominium_links
for each row execute function public.set_updated_at();
create or replace function public.guard_person_condominium_link_identity()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op='UPDATE' and (new.person_id is distinct from old.person_id or new.condominium_id is distinct from old.condominium_id) then
    raise exception 'Identidade e tenant do vínculo são imutáveis.' using errcode='23514';
  end if;
  return new;
end $$;
revoke all on function public.guard_person_condominium_link_identity() from public,anon,authenticated;
create trigger person_condominium_link_identity_guard before update on public.person_condominium_links
for each row execute function public.guard_person_condominium_link_identity();

create or replace function public.current_person_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select ua.person_id from public.user_accounts ua
  where ua.auth_user_id=(select auth.uid()) and ua.status='active'
$$;
revoke all on function public.current_person_id() from public,anon;
grant execute on function public.current_person_id() to authenticated;

alter table public.person_condominium_links enable row level security;
grant select, insert, update on public.person_condominium_links to authenticated;
revoke insert, update on public.person_condominium_links from authenticated;
grant update (status) on public.person_condominium_links to authenticated;
create policy person_condominium_links_read on public.person_condominium_links for select to authenticated
  using ((status = 'active' and public.has_permission('people.read', condominium_id))
    or person_id = public.current_person_id());
create policy person_condominium_links_insert on public.person_condominium_links for insert to authenticated
  with check (public.has_permission('people.manage', condominium_id));
create policy person_condominium_links_update on public.person_condominium_links for update to authenticated
  using (public.has_permission('people.manage', condominium_id))
  with check (public.has_permission('people.manage', condominium_id));

-- A condominium administrator may see a person only through that condominium's active link.
create or replace function public.can_read_person_in_authorized_context(target_person_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.current_user_account_id() is not null and exists (
    select 1 from public.person_condominium_links l
    where l.person_id = target_person_id and l.status = 'active'
      and public.has_permission('people.read', l.condominium_id)
  )
$$;
revoke all on function public.can_read_person_in_authorized_context(uuid) from public, anon;
grant execute on function public.can_read_person_in_authorized_context(uuid) to authenticated;

drop policy people_read_self on public.people;
create policy people_read_self on public.people for select to authenticated using (
  id = (select ua.person_id from public.user_accounts ua
    where ua.auth_user_id = (select auth.uid()) and ua.status = 'active')
  or public.can_read_person_in_authorized_context(id)
);
revoke update on public.people from authenticated;
grant update (full_name,preferred_name,birth_date,status) on public.people to authenticated;
create policy people_update_linked on public.people for update to authenticated
  using (exists (select 1 from public.person_condominium_links l where l.person_id=people.id and l.status='active' and public.has_permission('people.manage',l.condominium_id)))
  with check (exists (select 1 from public.person_condominium_links l where l.person_id=people.id and l.status='active' and public.has_permission('people.manage',l.condominium_id)));

create policy person_documents_read_visible on public.person_documents for select to authenticated
  using (person_id = public.current_person_id() or public.can_read_person_in_authorized_context(person_id));
create policy person_documents_manage_linked on public.person_documents for all to authenticated
  using (public.can_read_person_in_authorized_context(person_id)
    and exists (select 1 from public.person_condominium_links l where l.person_id = person_documents.person_id
      and l.status = 'active' and public.has_permission('people.manage', l.condominium_id)))
  with check (public.can_read_person_in_authorized_context(person_id)
    and exists (select 1 from public.person_condominium_links l where l.person_id = person_documents.person_id
      and l.status = 'active' and public.has_permission('people.manage', l.condominium_id)));
create policy person_phones_read_visible on public.person_phones for select to authenticated
  using (person_id = public.current_person_id() or public.can_read_person_in_authorized_context(person_id));
create policy person_phones_manage_linked on public.person_phones for all to authenticated
  using (public.can_read_person_in_authorized_context(person_id)
    and exists (select 1 from public.person_condominium_links l where l.person_id = person_phones.person_id
      and l.status = 'active' and public.has_permission('people.manage', l.condominium_id)))
  with check (public.can_read_person_in_authorized_context(person_id)
    and exists (select 1 from public.person_condominium_links l where l.person_id = person_phones.person_id
      and l.status = 'active' and public.has_permission('people.manage', l.condominium_id)));
create policy person_emails_read_visible on public.person_emails for select to authenticated
  using (person_id = public.current_person_id() or public.can_read_person_in_authorized_context(person_id));
create policy person_emails_manage_linked on public.person_emails for all to authenticated
  using (public.can_read_person_in_authorized_context(person_id)
    and exists (select 1 from public.person_condominium_links l where l.person_id = person_emails.person_id
      and l.status = 'active' and public.has_permission('people.manage', l.condominium_id)))
  with check (public.can_read_person_in_authorized_context(person_id)
    and exists (select 1 from public.person_condominium_links l where l.person_id = person_emails.person_id
      and l.status = 'active' and public.has_permission('people.manage', l.condominium_id)));

create or replace function public.is_valid_cpf(value text)
returns boolean language plpgsql immutable set search_path = '' as $$
declare digits text := pg_catalog.regexp_replace(coalesce(value,''), '[^0-9]', '', 'g');
  total integer; check_digit integer; i integer; all_same boolean := true;
begin
  if length(digits) <> 11 then return false; end if;
  for i in 2..11 loop if substr(digits,i,1) <> substr(digits,1,1) then all_same := false; end if; end loop;
  if all_same then return false; end if;
  total := 0; for i in 1..9 loop total := total + substr(digits,i,1)::integer * (11-i); end loop;
  check_digit := (total * 10) % 11; if check_digit = 10 then check_digit := 0; end if;
  if check_digit <> substr(digits,10,1)::integer then return false; end if;
  total := 0; for i in 1..10 loop total := total + substr(digits,i,1)::integer * (12-i); end loop;
  check_digit := (total * 10) % 11; if check_digit = 10 then check_digit := 0; end if;
  return check_digit = substr(digits,11,1)::integer;
end $$;
revoke all on function public.is_valid_cpf(text) from public, anon;
grant execute on function public.is_valid_cpf(text) to authenticated;

-- Only this permission-checked RPC may resolve CPF across tenants. It returns only the
-- resulting person UUID and a neutral exception on conflicts; it never exposes a global search.
create or replace function public.resolve_or_create_person_for_condominium(
  target_condominium_id uuid, p_full_name text, p_preferred_name text default null,
  p_birth_date date default null, p_cpf text default null, p_email text default null, p_phone text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := public.current_user_account_id(); result_person uuid; cpf_digits text;
  cpf_hash text; v_normalized_email text; v_normalized_phone text; existing_name text; existing_status text;
begin
  if actor is null or not public.has_permission('people.manage', target_condominium_id) then
    raise exception 'Registro não encontrado ou operação não permitida.' using errcode = '42501';
  end if;
  if p_full_name is null or length(btrim(p_full_name)) < 2 then
    raise exception 'Informe o nome completo.' using errcode = '22023';
  end if;
  cpf_digits := nullif(pg_catalog.regexp_replace(coalesce(p_cpf,''), '[^0-9]', '', 'g'), '');
  if cpf_digits is not null then
    if not public.is_valid_cpf(cpf_digits) then raise exception 'Documento inválido.' using errcode = '22023'; end if;
    cpf_hash := encode(extensions.digest(cpf_digits, 'sha256'), 'hex');
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('cpf:' || cpf_hash, 721));
    select d.person_id, p.full_name, p.status into result_person, existing_name, existing_status
      from public.person_documents d join public.people p on p.id = d.person_id
      where d.document_type = 'cpf' and d.document_hash = cpf_hash limit 1;
    if result_person is not null then
      if existing_status<>'active' then raise exception 'Não foi possível validar os dados informados.' using errcode='23514'; end if;
      if lower(btrim(existing_name)) <> lower(btrim(p_full_name)) then
        raise exception 'Não foi possível validar os dados informados.' using errcode = '23514';
      end if;
      if not exists (select 1 from public.person_condominium_links l where l.person_id=result_person and l.condominium_id=target_condominium_id and l.status='active') then
        insert into public.person_condominium_links(person_id, condominium_id) values(result_person,target_condominium_id)
        on conflict (condominium_id,person_id) do update set status='active';
      end if;
      return result_person;
    end if;
  end if;
  v_normalized_email := nullif(lower(btrim(p_email)), '');
  v_normalized_phone := nullif(pg_catalog.regexp_replace(coalesce(p_phone,''), '[^0-9+]', '', 'g'), '');
  if v_normalized_email is not null and exists (
    select 1 from public.person_emails e join public.person_condominium_links l on l.person_id=e.person_id
    where l.condominium_id=target_condominium_id and l.status='active' and e.normalized_email=v_normalized_email
  ) then raise exception 'Possível pessoa existente. Revise a lista do condomínio.' using errcode = '23505'; end if;
  if v_normalized_phone is not null and exists (
    select 1 from public.person_phones ph join public.person_condominium_links l on l.person_id=ph.person_id
    where l.condominium_id=target_condominium_id and l.status='active' and ph.phone_e164=v_normalized_phone
  ) then raise exception 'Possível pessoa existente. Revise a lista do condomínio.' using errcode = '23505'; end if;
  insert into public.people(full_name, preferred_name, birth_date, status)
    values(btrim(p_full_name), nullif(btrim(p_preferred_name),''), p_birth_date, 'active') returning id into result_person;
  insert into public.person_condominium_links(person_id, condominium_id) values(result_person,target_condominium_id);
  if cpf_digits is not null then
    insert into public.person_documents(person_id,document_type,document_hash,normalized_number,is_primary,country_code)
    values(result_person,'cpf',cpf_hash,cpf_digits,true,'BR');
  end if;
  if v_normalized_email is not null then
    insert into public.person_emails(person_id,email,is_primary)
      values(result_person,v_normalized_email,true);
  end if;
  if v_normalized_phone is not null then
    insert into public.person_phones(person_id,phone_e164,is_primary)
      values(result_person,v_normalized_phone,true);
  end if;
  return result_person;
end $$;
revoke all on function public.resolve_or_create_person_for_condominium(uuid,text,text,date,text,text,text) from public, anon;
grant execute on function public.resolve_or_create_person_for_condominium(uuid,text,text,date,text,text,text) to authenticated;

create or replace function public.set_person_cpf(p_person_id uuid,p_condominium_id uuid,p_cpf text,p_confirm boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare digits text:=pg_catalog.regexp_replace(coalesce(p_cpf,''),'[^0-9]','','g'); cpf_hash text; current_hash text;
begin
  if not p_confirm then raise exception 'Confirme a alteração do documento.' using errcode='22023'; end if;
  if not public.has_permission('people.manage',p_condominium_id) or not exists(select 1 from public.person_condominium_links l where l.person_id=p_person_id and l.condominium_id=p_condominium_id and l.status='active') then
    raise exception 'Registro não encontrado ou operação não permitida.' using errcode='42501';
  end if;
  if not public.is_valid_cpf(digits) then raise exception 'Documento inválido.' using errcode='22023'; end if;
  cpf_hash:=encode(extensions.digest(digits,'sha256'),'hex');
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('cpf:'||cpf_hash,721));
  select document_hash into current_hash from public.person_documents where person_id=p_person_id and document_type='cpf' and is_primary limit 1;
  if current_hash=cpf_hash then return true; end if;
  if exists(select 1 from public.person_documents d where d.document_type='cpf' and d.document_hash=cpf_hash and d.person_id<>p_person_id) then
    raise exception 'Não foi possível validar os dados informados.' using errcode='23505';
  end if;
  update public.person_documents set is_primary=false where person_id=p_person_id and document_type='cpf' and is_primary;
  insert into public.person_documents(person_id,document_type,document_hash,normalized_number,is_primary,country_code)
    values(p_person_id,'cpf',cpf_hash,digits,true,'BR');
  return true;
end $$;
revoke all on function public.set_person_cpf(uuid,uuid,text,boolean) from public,anon;
grant execute on function public.set_person_cpf(uuid,uuid,text,boolean) to authenticated;

insert into public.permissions(code,description,scope) values
 ('people.read','Visualizar pessoas vinculadas ao condomínio','condominium'),
 ('people.manage','Gerenciar pessoas vinculadas ao condomínio','condominium'),
 ('residents.read','Visualizar moradores','condominium'),
 ('residents.manage','Gerenciar moradores','condominium'),
 ('ownerships.read','Visualizar proprietários','condominium'),
 ('ownerships.manage','Gerenciar proprietários','condominium'),
 ('financial_responsibilities.read','Visualizar responsáveis financeiros','condominium'),
 ('financial_responsibilities.manage','Gerenciar responsáveis financeiros','condominium')
on conflict(code) do nothing;
insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r cross join public.permissions p
where r.code in ('condominium.syndic','condominium.manager')
  and p.code in ('people.read','people.manage','residents.read','residents.manage','ownerships.read','ownerships.manage','financial_responsibilities.read','financial_responsibilities.manage')
on conflict do nothing;

alter table public.audit_events drop constraint audit_events_entity_type_check;
alter table public.audit_events add constraint audit_events_entity_type_check check (entity_type in (
 'user_invitation','condominium_membership','administrator_membership','administrator_condominium_access',
 'platform_membership','role_assignment','permission_override','user_account','condominium','address','condominium_structure','unit','person','person_document',
 'person_email','person_phone','person_condominium_link','unit_ownership','unit_occupancy','unit_financial_responsibility'));

create or replace function public.audit_p3_person_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare entity text; row_id uuid; condo uuid; event text; safe jsonb := '{}'::jsonb; person uuid;
begin
  entity := case tg_table_name when 'people' then 'person' when 'person_documents' then 'person_document'
    when 'person_emails' then 'person_email' when 'person_phones' then 'person_phone'
    when 'person_condominium_links' then 'person_condominium_link' else null end;
  if entity is null then return coalesce(new,old); end if;
  row_id := (to_jsonb(coalesce(new,old))->>'id')::uuid;
  person := case when tg_table_name='people' then row_id else coalesce((to_jsonb(new)->>'person_id')::uuid,(to_jsonb(old)->>'person_id')::uuid) end;
  if tg_table_name='person_condominium_links' then condo:=coalesce((to_jsonb(new)->>'condominium_id')::uuid,(to_jsonb(old)->>'condominium_id')::uuid); else
    select l.condominium_id into condo from public.person_condominium_links l where l.person_id=person and l.status='active' order by l.created_at limit 1;
  end if;
  event := entity || case when tg_op='INSERT' then '.created' when tg_op='DELETE' then '.deleted' else '.changed' end;
  if tg_table_name='people' then safe:=jsonb_strip_nulls(jsonb_build_object('status',to_jsonb(coalesce(new,old))->>'status')); end if;
  if condo is not null then safe:=safe || jsonb_build_object('condominium_id',condo); end if;
  insert into public.audit_events(actor_auth_user_id,actor_user_account_id,event_type,entity_type,entity_id,metadata)
  values((select auth.uid()),public.current_user_account_id(),event,entity,row_id,safe);
  return coalesce(new,old);
end $$;
revoke all on function public.audit_p3_person_change() from public,anon,authenticated;
create trigger people_p3_audit after insert or update on public.people for each row execute function public.audit_p3_person_change();
create trigger person_documents_p3_audit after insert or update or delete on public.person_documents for each row execute function public.audit_p3_person_change();
create trigger person_emails_p3_audit after insert or update or delete on public.person_emails for each row execute function public.audit_p3_person_change();
create trigger person_phones_p3_audit after insert or update or delete on public.person_phones for each row execute function public.audit_p3_person_change();
create trigger person_condominium_links_p3_audit after insert or update on public.person_condominium_links for each row execute function public.audit_p3_person_change();
