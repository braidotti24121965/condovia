-- P3: temporal ownership, occupancy and financial responsibility.
alter table public.units add constraint units_id_condominium_unique unique (id, condominium_id);

create table public.unit_ownerships (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  unit_id uuid not null,
  person_id uuid not null,
  ownership_percentage numeric(7,4) check (ownership_percentage is null or ownership_percentage > 0 and ownership_percentage <= 100),
  starts_at date not null,
  ends_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  foreign key (unit_id, condominium_id) references public.units(id, condominium_id) on delete restrict,
  foreign key (person_id, condominium_id) references public.person_condominium_links(person_id, condominium_id) on delete restrict
);
create index unit_ownerships_unit_period_idx on public.unit_ownerships(condominium_id,unit_id,starts_at,ends_at);
create index unit_ownerships_person_period_idx on public.unit_ownerships(person_id,starts_at,ends_at);

create table public.unit_occupancies (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  unit_id uuid not null,
  person_id uuid not null,
  occupancy_type text not null check (occupancy_type in ('owner','tenant','family_member','dependent','other')),
  is_primary boolean not null default false,
  starts_at date not null,
  ends_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  foreign key (unit_id, condominium_id) references public.units(id, condominium_id) on delete restrict,
  foreign key (person_id, condominium_id) references public.person_condominium_links(person_id, condominium_id) on delete restrict
);
create index unit_occupancies_unit_period_idx on public.unit_occupancies(condominium_id,unit_id,starts_at,ends_at);
create index unit_occupancies_person_period_idx on public.unit_occupancies(person_id,starts_at,ends_at);
create index unit_occupancies_primary_period_idx on public.unit_occupancies(unit_id,starts_at,ends_at) where is_primary;

create table public.unit_financial_responsibilities (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  unit_id uuid not null,
  person_id uuid not null,
  starts_at date not null,
  ends_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  foreign key (unit_id, condominium_id) references public.units(id, condominium_id) on delete restrict,
  foreign key (person_id, condominium_id) references public.person_condominium_links(person_id, condominium_id) on delete restrict
);
create index unit_financial_responsibilities_unit_period_idx on public.unit_financial_responsibilities(condominium_id,unit_id,starts_at,ends_at);
create index unit_financial_responsibilities_person_period_idx on public.unit_financial_responsibilities(person_id,starts_at,ends_at);

create trigger unit_ownerships_updated_at before update on public.unit_ownerships for each row execute function public.set_updated_at();
create trigger unit_occupancies_updated_at before update on public.unit_occupancies for each row execute function public.set_updated_at();
create trigger unit_financial_responsibilities_updated_at before update on public.unit_financial_responsibilities for each row execute function public.set_updated_at();

create or replace function public.guard_unit_person_relationship()
returns trigger language plpgsql security definer set search_path = '' as $$
declare rel_table text:=tg_table_name; conflict_exists boolean; known_total numeric; unit_state text;
begin
  if tg_op='UPDATE' and (new.condominium_id is distinct from old.condominium_id or new.unit_id is distinct from old.unit_id or new.person_id is distinct from old.person_id) then
    raise exception 'Tenant, unit and person are immutable; close history and create a new relationship.' using errcode='23514';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.condominium_id::text||':'||new.unit_id::text, 713));
  if (tg_op='INSERT' or new.starts_at is distinct from old.starts_at) and not exists(select 1 from public.person_condominium_links l join public.people p on p.id=l.person_id
    where l.person_id=new.person_id and l.condominium_id=new.condominium_id and l.status='active' and p.status='active') then
    raise exception 'Pessoa ativa não vinculada a este condomínio.' using errcode='23514';
  end if;
  select operational_status into unit_state from public.units where id=new.unit_id and condominium_id=new.condominium_id;
  if unit_state='inactive' and (tg_op='INSERT' or new.starts_at is distinct from old.starts_at) then raise exception 'Unidade inativa não aceita novos vínculos.' using errcode='23514'; end if;
  if rel_table='unit_occupancies' and unit_state='under_construction' and (tg_op='INSERT' or new.starts_at is distinct from old.starts_at) then raise exception 'Unidade em construção não aceita moradores.' using errcode='23514'; end if;
  if rel_table='unit_ownerships' then
    select exists(select 1 from public.unit_ownerships x where x.unit_id=new.unit_id and x.person_id=new.person_id
      and x.id is distinct from new.id and daterange(x.starts_at,x.ends_at,'[)') && daterange(new.starts_at,new.ends_at,'[)')) into conflict_exists;
    if conflict_exists then raise exception 'Períodos de propriedade da mesma pessoa não podem se sobrepor.' using errcode='23P01'; end if;
    if new.ownership_percentage is not null then
      select coalesce(max(boundary_total),0) into known_total from (
        select (select coalesce(sum(x.ownership_percentage),0) from public.unit_ownerships x
          where x.unit_id=new.unit_id and x.id is distinct from new.id and x.ownership_percentage is not null
            and daterange(x.starts_at,x.ends_at,'[)') @> boundaries.d)::numeric + new.ownership_percentage as boundary_total
        from (select new.starts_at as d union select greatest(x.starts_at,new.starts_at) from public.unit_ownerships x
          where x.unit_id=new.unit_id and x.id is distinct from new.id and x.ownership_percentage is not null
            and daterange(x.starts_at,x.ends_at,'[)') && daterange(new.starts_at,new.ends_at,'[)')) boundaries
      ) totals;
      if known_total>100 then raise exception 'A soma das participações conhecidas neste período excede 100%%.' using errcode='23514'; end if;
    end if;
    if tg_op='UPDATE' and exists(select 1 from public.unit_occupancies o where o.unit_id=new.unit_id and o.person_id=new.person_id and o.occupancy_type='owner'
      and not (new.starts_at<=o.starts_at and (new.ends_at is null or o.ends_at is not null and new.ends_at>=o.ends_at))
      and not exists(select 1 from public.unit_ownerships other where other.id<>old.id and other.unit_id=o.unit_id and other.person_id=o.person_id
        and other.starts_at<=o.starts_at and (other.ends_at is null or o.ends_at is not null and other.ends_at>=o.ends_at))) then
      raise exception 'A propriedade não pode ser encerrada antes da moradia registrada como proprietário.' using errcode='23514';
    end if;
  elsif rel_table='unit_occupancies' then
    select exists(select 1 from public.unit_occupancies x where x.unit_id=new.unit_id and x.person_id=new.person_id
      and x.id is distinct from new.id and daterange(x.starts_at,x.ends_at,'[)') && daterange(new.starts_at,new.ends_at,'[)')) into conflict_exists;
    if conflict_exists then raise exception 'Períodos de moradia da mesma pessoa não podem se sobrepor.' using errcode='23P01'; end if;
    if new.is_primary and exists(select 1 from public.unit_occupancies x where x.unit_id=new.unit_id and x.is_primary
      and x.id is distinct from new.id and daterange(x.starts_at,x.ends_at,'[)') && daterange(new.starts_at,new.ends_at,'[)')) then
      raise exception 'Já existe morador principal neste período.' using errcode='23P01';
    end if;
    if new.occupancy_type='owner' and not exists(select 1 from public.unit_ownerships o where o.unit_id=new.unit_id and o.person_id=new.person_id
      and o.starts_at<=new.starts_at and (o.ends_at is null or new.ends_at is not null and o.ends_at>=new.ends_at)) then
      raise exception 'Moradia do tipo proprietário exige propriedade cobrindo todo o período.' using errcode='23514';
    end if;
  else
    if exists(select 1 from public.unit_financial_responsibilities x where x.unit_id=new.unit_id and x.id is distinct from new.id
      and daterange(x.starts_at,x.ends_at,'[)') && daterange(new.starts_at,new.ends_at,'[)')) then
      raise exception 'Já existe responsável financeiro neste período.' using errcode='23P01';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.guard_unit_person_relationship() from public,anon,authenticated;
create trigger unit_ownerships_guard before insert or update on public.unit_ownerships for each row execute function public.guard_unit_person_relationship();
create trigger unit_occupancies_guard before insert or update on public.unit_occupancies for each row execute function public.guard_unit_person_relationship();
create trigger unit_financial_responsibilities_guard before insert or update on public.unit_financial_responsibilities for each row execute function public.guard_unit_person_relationship();

create or replace function public.guard_person_deactivation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status='inactive' and old.status is distinct from new.status then
    if exists(select 1 from public.unit_ownerships r join public.condominiums c on c.id=r.condominium_id where r.person_id=new.id and (r.ends_at is null or r.ends_at>timezone(c.timezone,now())::date))
      or exists(select 1 from public.unit_occupancies r join public.condominiums c on c.id=r.condominium_id where r.person_id=new.id and (r.ends_at is null or r.ends_at>timezone(c.timezone,now())::date))
      or exists(select 1 from public.unit_financial_responsibilities r join public.condominiums c on c.id=r.condominium_id where r.person_id=new.id and (r.ends_at is null or r.ends_at>timezone(c.timezone,now())::date)) then
      raise exception 'Pessoa com vínculo vigente não pode ser inativada.' using errcode='23514';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.guard_person_deactivation() from public,anon,authenticated;
create trigger people_p3_deactivation_guard before update of status on public.people for each row execute function public.guard_person_deactivation();

create or replace function public.guard_person_condominium_link_status()
returns trigger language plpgsql security definer set search_path = '' as $$
declare local_today date;
begin
  if new.status='inactive' and old.status='active' then
    select timezone(c.timezone,now())::date into local_today from public.condominiums c where c.id=new.condominium_id;
    if exists(select 1 from public.unit_ownerships r where r.person_id=new.person_id and r.condominium_id=new.condominium_id and (r.ends_at is null or r.ends_at>local_today))
      or exists(select 1 from public.unit_occupancies r where r.person_id=new.person_id and r.condominium_id=new.condominium_id and (r.ends_at is null or r.ends_at>local_today))
      or exists(select 1 from public.unit_financial_responsibilities r where r.person_id=new.person_id and r.condominium_id=new.condominium_id and (r.ends_at is null or r.ends_at>local_today)) then
      raise exception 'Vínculo pessoa-condomínio possui relacionamento vigente.' using errcode='23514';
    end if;
  end if;
  if new.status='active' and exists(select 1 from public.people p where p.id=new.person_id and p.status<>'active') then
    raise exception 'Somente pessoa ativa pode ser vinculada ao condomínio.' using errcode='23514';
  end if;
  return new;
end $$;
revoke all on function public.guard_person_condominium_link_status() from public,anon,authenticated;
create trigger person_condominium_link_status_guard before update of status on public.person_condominium_links for each row execute function public.guard_person_condominium_link_status();

do $$ declare t text; begin
  foreach t in array array['unit_ownerships','unit_occupancies','unit_financial_responsibilities'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('grant select, insert, update on public.%I to authenticated',t);
  end loop;
end $$;
create or replace function public.can_read_own_person_data(p_person_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.current_person_id()=p_person_id and exists(select 1 from public.person_condominium_links l
    where l.person_id=p_person_id and l.status='active' and public.has_condominium_access(l.condominium_id))
$$;
create or replace function public.can_read_own_unit_relationship(p_person_id uuid,p_condominium_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.current_person_id()=p_person_id and public.has_condominium_access(p_condominium_id)
    and exists(select 1 from public.person_condominium_links l where l.person_id=p_person_id and l.condominium_id=p_condominium_id and l.status='active')
$$;
revoke all on function public.can_read_own_person_data(uuid) from public,anon;
revoke all on function public.can_read_own_unit_relationship(uuid,uuid) from public,anon;
grant execute on function public.can_read_own_person_data(uuid) to authenticated;
grant execute on function public.can_read_own_unit_relationship(uuid,uuid) to authenticated;

drop policy person_condominium_links_read on public.person_condominium_links;
create policy person_condominium_links_read on public.person_condominium_links for select to authenticated
  using ((status='active' and public.has_permission('people.read',condominium_id)) or public.can_read_own_unit_relationship(person_id,condominium_id));
drop policy person_documents_read_visible on public.person_documents;
create policy person_documents_read_visible on public.person_documents for select to authenticated
  using (public.can_read_own_person_data(person_id) or public.can_read_person_in_authorized_context(person_id));
drop policy person_phones_read_visible on public.person_phones;
create policy person_phones_read_visible on public.person_phones for select to authenticated
  using (public.can_read_own_person_data(person_id) or public.can_read_person_in_authorized_context(person_id));
drop policy person_emails_read_visible on public.person_emails;
create policy person_emails_read_visible on public.person_emails for select to authenticated
  using (public.can_read_own_person_data(person_id) or public.can_read_person_in_authorized_context(person_id));
drop policy people_read_self on public.people;
create policy people_read_self on public.people for select to authenticated using (
  public.can_read_own_person_data(id) or public.can_read_person_in_authorized_context(id));
create policy unit_ownerships_admin_read on public.unit_ownerships for select to authenticated
  using (public.has_permission('ownerships.read',condominium_id) and exists(select 1 from public.person_condominium_links l where l.person_id=unit_ownerships.person_id and l.condominium_id=unit_ownerships.condominium_id and l.status='active'));
create policy unit_ownerships_self_read on public.unit_ownerships for select to authenticated using (public.can_read_own_unit_relationship(person_id,condominium_id));
create policy unit_ownerships_manage on public.unit_ownerships for insert to authenticated with check (public.has_permission('ownerships.manage',condominium_id));
create policy unit_ownerships_update on public.unit_ownerships for update to authenticated using (public.has_permission('ownerships.manage',condominium_id)) with check (public.has_permission('ownerships.manage',condominium_id));
create policy unit_occupancies_admin_read on public.unit_occupancies for select to authenticated
  using (public.has_permission('residents.read',condominium_id) and exists(select 1 from public.person_condominium_links l where l.person_id=unit_occupancies.person_id and l.condominium_id=unit_occupancies.condominium_id and l.status='active'));
create policy unit_occupancies_self_read on public.unit_occupancies for select to authenticated using (public.can_read_own_unit_relationship(person_id,condominium_id));
create policy unit_occupancies_manage on public.unit_occupancies for insert to authenticated with check (public.has_permission('residents.manage',condominium_id));
create policy unit_occupancies_update on public.unit_occupancies for update to authenticated using (public.has_permission('residents.manage',condominium_id)) with check (public.has_permission('residents.manage',condominium_id));
create policy unit_financial_responsibilities_admin_read on public.unit_financial_responsibilities for select to authenticated
  using (public.has_permission('financial_responsibilities.read',condominium_id) and exists(select 1 from public.person_condominium_links l where l.person_id=unit_financial_responsibilities.person_id and l.condominium_id=unit_financial_responsibilities.condominium_id and l.status='active'));
create policy unit_financial_responsibilities_self_read on public.unit_financial_responsibilities for select to authenticated using (public.can_read_own_unit_relationship(person_id,condominium_id));
create policy unit_financial_responsibilities_manage on public.unit_financial_responsibilities for insert to authenticated with check (public.has_permission('financial_responsibilities.manage',condominium_id));
create policy unit_financial_responsibilities_update on public.unit_financial_responsibilities for update to authenticated using (public.has_permission('financial_responsibilities.manage',condominium_id)) with check (public.has_permission('financial_responsibilities.manage',condominium_id));

-- Residents may retrieve only units they own or occupy at the current date in the condo timezone.
create policy units_read_own_relationships on public.units for select to authenticated using (
  exists(select 1 from public.unit_occupancies o join public.condominiums c on c.id=o.condominium_id where o.unit_id=units.id and public.can_read_own_unit_relationship(o.person_id,o.condominium_id) and o.starts_at<=timezone(c.timezone,now())::date and (o.ends_at is null or o.ends_at>timezone(c.timezone,now())::date))
  or exists(select 1 from public.unit_ownerships o join public.condominiums c on c.id=o.condominium_id where o.unit_id=units.id and public.can_read_own_unit_relationship(o.person_id,o.condominium_id) and o.starts_at<=timezone(c.timezone,now())::date and (o.ends_at is null or o.ends_at>timezone(c.timezone,now())::date))
);

drop function if exists public.change_primary_resident(uuid,uuid,uuid,date,text);
create or replace function public.change_primary_resident(p_unit_id uuid,p_condominium_id uuid,p_person_id uuid,p_starts_at date,p_occupancy_type text default 'tenant',p_ends_at date default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare old_row public.unit_occupancies%rowtype; new_id uuid; today_local date;
begin
  if not public.has_permission('residents.manage',p_condominium_id) then raise exception 'Operação não permitida.' using errcode='42501'; end if;
  if p_ends_at is not null and p_ends_at<=p_starts_at then raise exception 'O término deve ser posterior ao início.' using errcode='22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_condominium_id::text||':'||p_unit_id::text,713));
  for old_row in select * from public.unit_occupancies o where o.unit_id=p_unit_id and o.is_primary
    and daterange(o.starts_at,o.ends_at,'[)') && daterange(p_starts_at,p_ends_at,'[)') order by o.starts_at desc for update loop
    if old_row.starts_at>=p_starts_at then raise exception 'A data de início conflita com o morador principal atual.' using errcode='23P01'; end if;
    update public.unit_occupancies set ends_at=p_starts_at where id=old_row.id;
  end loop;
  insert into public.unit_occupancies(condominium_id,unit_id,person_id,occupancy_type,is_primary,starts_at,ends_at)
  values(p_condominium_id,p_unit_id,p_person_id,p_occupancy_type,true,p_starts_at,p_ends_at) returning id into new_id;
  return new_id;
end $$;
revoke all on function public.change_primary_resident(uuid,uuid,uuid,date,text,date) from public,anon;
grant execute on function public.change_primary_resident(uuid,uuid,uuid,date,text,date) to authenticated;

create or replace function public.set_unit_financial_responsibility(p_unit_id uuid,p_condominium_id uuid,p_person_id uuid,p_starts_at date,p_notes text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare old_row public.unit_financial_responsibilities%rowtype; new_id uuid;
begin
  if not public.has_permission('financial_responsibilities.manage',p_condominium_id) then raise exception 'Operação não permitida.' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_condominium_id::text||':'||p_unit_id::text,713));
  for old_row in select * from public.unit_financial_responsibilities r where r.unit_id=p_unit_id
    and daterange(r.starts_at,r.ends_at,'[)') && daterange(p_starts_at,null,'[)') order by r.starts_at desc for update loop
    if old_row.starts_at>=p_starts_at then raise exception 'A data de início conflita com o responsável atual.' using errcode='23P01'; end if;
    update public.unit_financial_responsibilities set ends_at=p_starts_at where id=old_row.id;
  end loop;
  insert into public.unit_financial_responsibilities(condominium_id,unit_id,person_id,starts_at,notes)
  values(p_condominium_id,p_unit_id,p_person_id,p_starts_at,p_notes) returning id into new_id;
  return new_id;
end $$;
revoke all on function public.set_unit_financial_responsibility(uuid,uuid,uuid,date,text) from public,anon;
grant execute on function public.set_unit_financial_responsibility(uuid,uuid,uuid,date,text) to authenticated;

alter table public.audit_events drop constraint audit_events_entity_type_check;
alter table public.audit_events add constraint audit_events_entity_type_check check (entity_type in (
 'user_invitation','condominium_membership','administrator_membership','administrator_condominium_access','platform_membership','role_assignment','permission_override','user_account','condominium','address','condominium_structure','unit','person','person_document','person_email','person_phone','person_condominium_link','unit_ownership','unit_occupancy','unit_financial_responsibility'));
create or replace function public.audit_unit_person_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare entity text; row_id uuid; safe jsonb; row_data jsonb; begin
  row_data:=to_jsonb(coalesce(new,old));
  entity:=case tg_table_name when 'unit_ownerships' then 'unit_ownership' when 'unit_occupancies' then 'unit_occupancy' else 'unit_financial_responsibility' end;
  row_id:=(row_data->>'id')::uuid;
  safe:=jsonb_strip_nulls(jsonb_build_object('condominium_id',row_data->>'condominium_id','unit_id',row_data->>'unit_id','person_id',row_data->>'person_id','starts_at',row_data->>'starts_at','ends_at',row_data->>'ends_at','occupancy_type',row_data->>'occupancy_type','is_primary',row_data->>'is_primary','ownership_percentage',row_data->>'ownership_percentage'));
  insert into public.audit_events(actor_auth_user_id,actor_user_account_id,event_type,entity_type,entity_id,metadata)
  values((select auth.uid()),public.current_user_account_id(),entity||case when tg_op='INSERT' then '.created' else '.changed' end,entity,row_id,safe);
  return coalesce(new,old);
end $$;
revoke all on function public.audit_unit_person_change() from public,anon,authenticated;
create trigger unit_ownerships_audit after insert or update on public.unit_ownerships for each row execute function public.audit_unit_person_change();
create trigger unit_occupancies_audit after insert or update on public.unit_occupancies for each row execute function public.audit_unit_person_change();
create trigger unit_financial_responsibilities_audit after insert or update on public.unit_financial_responsibilities for each row execute function public.audit_unit_person_change();

create policy audit_events_p3_read on public.audit_events for select to authenticated using (
  (entity_type='person' and public.can_read_person_in_authorized_context(entity_id))
  or (entity_type='person_document' and exists(select 1 from public.person_documents d join public.person_condominium_links l on l.person_id=d.person_id where d.id=entity_id and l.status='active' and public.has_permission('people.read',l.condominium_id)))
  or (entity_type='person_email' and exists(select 1 from public.person_emails e join public.person_condominium_links l on l.person_id=e.person_id where e.id=entity_id and l.status='active' and public.has_permission('people.read',l.condominium_id)))
  or (entity_type='person_phone' and exists(select 1 from public.person_phones p join public.person_condominium_links l on l.person_id=p.person_id where p.id=entity_id and l.status='active' and public.has_permission('people.read',l.condominium_id)))
  or (entity_type='person_condominium_link' and exists(select 1 from public.person_condominium_links l where l.id=entity_id and l.status='active' and public.has_permission('people.read',l.condominium_id)))
  or (entity_type='unit_ownership' and exists(select 1 from public.unit_ownerships r where r.id=entity_id and public.has_permission('ownerships.read',r.condominium_id)))
  or (entity_type='unit_occupancy' and exists(select 1 from public.unit_occupancies r where r.id=entity_id and public.has_permission('residents.read',r.condominium_id)))
  or (entity_type='unit_financial_responsibility' and exists(select 1 from public.unit_financial_responsibilities r where r.id=entity_id and public.has_permission('financial_responsibilities.read',r.condominium_id)))
);

create or replace function public.get_person_resident_access_summary(p_person_id uuid,p_condominium_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare out_value jsonb; local_today date;
begin
  if not public.has_permission('people.read',p_condominium_id) or not exists(
    select 1 from public.person_condominium_links l where l.person_id=p_person_id and l.condominium_id=p_condominium_id and l.status='active') then
    raise exception 'Registro não encontrado.' using errcode='42501';
  end if;
  select timezone(c.timezone,now())::date into local_today from public.condominiums c where c.id=p_condominium_id;
  select jsonb_build_object(
    'account_status', coalesce((select ua.status from public.user_accounts ua where ua.person_id=p_person_id),'none'),
    'active_membership', exists(select 1 from public.user_accounts ua join public.condominium_memberships m on m.user_account_id=ua.id
      where ua.person_id=p_person_id and ua.status='active' and m.condominium_id=p_condominium_id and m.status='active' and m.starts_at<=now() and (m.ends_at is null or m.ends_at>now())),
    'eligible_relationship', exists(select 1 from public.unit_ownerships r where r.person_id=p_person_id and r.condominium_id=p_condominium_id and (r.ends_at is null or r.ends_at>local_today))
      or exists(select 1 from public.unit_occupancies r where r.person_id=p_person_id and r.condominium_id=p_condominium_id and (r.ends_at is null or r.ends_at>local_today)),
    'pending_invitation', exists(select 1 from public.user_invitations i where i.person_id=p_person_id and i.condominium_id=p_condominium_id and i.invitation_type='condominium' and i.status='pending' and i.expires_at>now()),
    'access_without_eligible_relationship', exists(select 1 from public.user_accounts ua join public.condominium_memberships m on m.user_account_id=ua.id
      where ua.person_id=p_person_id and ua.status='active' and m.condominium_id=p_condominium_id and m.status='active' and m.starts_at<=now() and (m.ends_at is null or m.ends_at>now()))
      and not (exists(select 1 from public.unit_ownerships r where r.person_id=p_person_id and r.condominium_id=p_condominium_id and r.starts_at<=local_today and (r.ends_at is null or r.ends_at>local_today))
        or exists(select 1 from public.unit_occupancies r where r.person_id=p_person_id and r.condominium_id=p_condominium_id and r.starts_at<=local_today and (r.ends_at is null or r.ends_at>local_today)))
  ) into out_value;
  return out_value;
end $$;
revoke all on function public.get_person_resident_access_summary(uuid,uuid) from public,anon;
grant execute on function public.get_person_resident_access_summary(uuid,uuid) to authenticated;
