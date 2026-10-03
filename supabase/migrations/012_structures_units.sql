create table public.condominium_structures (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  parent_id uuid,
  structure_type text not null check (structure_type in ('block','tower','sector','building','wing','street','phase','other')),
  name text not null check (length(btrim(name)) > 0),
  code text check (code is null or length(btrim(code)) > 0),
  sort_order integer not null default 0,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, condominium_id),
  foreign key (parent_id, condominium_id) references public.condominium_structures(id, condominium_id) on delete restrict
);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  structure_id uuid,
  code text not null check (length(btrim(code)) > 0),
  display_name text,
  unit_type text not null check (unit_type in ('apartment','house','lot','commercial','office','store','other')),
  floor text,
  area numeric(12,2) check (area is null or area > 0),
  ownership_fraction numeric(12,6) check (ownership_fraction is null or ownership_fraction between 0 and 100),
  operational_status text not null default 'active' check (operational_status in ('active','inactive','under_construction','blocked')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (structure_id, condominium_id) references public.condominium_structures(id, condominium_id) on delete restrict
);

create unique index condominium_structures_root_name_uidx on public.condominium_structures(condominium_id, lower(btrim(name))) where parent_id is null;
create unique index condominium_structures_child_name_uidx on public.condominium_structures(condominium_id, parent_id, lower(btrim(name))) where parent_id is not null;
create index condominium_structures_parent_idx on public.condominium_structures(condominium_id, parent_id, sort_order, id);
create index condominium_structures_status_idx on public.condominium_structures(condominium_id, status);
create unique index units_root_code_uidx on public.units(condominium_id, lower(btrim(code))) where structure_id is null;
create unique index units_structure_code_uidx on public.units(condominium_id, structure_id, lower(btrim(code))) where structure_id is not null;
create index units_condominium_status_idx on public.units(condominium_id, operational_status, code);
create index units_structure_idx on public.units(structure_id) where structure_id is not null;
create index units_name_search_idx on public.units(condominium_id, lower(code), lower(coalesce(display_name,'')));

create or replace function public.guard_condominium_structure()
returns trigger language plpgsql security definer set search_path = '' as $$
declare has_active_descendants boolean;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(coalesce(new.condominium_id, old.condominium_id)::text, 12));
  if tg_op = 'UPDATE' and new.condominium_id is distinct from old.condominium_id then
    raise exception 'Structure tenant cannot be changed' using errcode = '23514';
  end if;
  if new.code is not null and btrim(new.code) = '' then raise exception 'Structure code cannot be blank' using errcode = '23514'; end if;
  new.name := btrim(new.name);
  new.code := nullif(btrim(new.code), '');
  if new.parent_id = new.id then raise exception 'Structure cannot parent itself' using errcode = '23514'; end if;
  if new.parent_id is not null and not exists (
    select 1 from public.condominium_structures parent where parent.id = new.parent_id
      and parent.condominium_id = new.condominium_id and parent.status = 'active'
  ) and new.status = 'active' then
    raise exception 'Active structure requires an active parent in the same condominium' using errcode = '23514';
  end if;
  if new.status = 'active' and new.parent_id is not null and not exists (
    select 1 from public.condominium_structures parent where parent.id = new.parent_id
      and parent.condominium_id = new.condominium_id and parent.status = 'active'
  ) then raise exception 'Parent structure is inactive or outside condominium' using errcode = '23514'; end if;
  if tg_op = 'UPDATE' and new.parent_id is distinct from old.parent_id and new.parent_id is not null then
    if exists (with recursive descendants(id) as (
      select id from public.condominium_structures where parent_id = new.id and condominium_id = new.condominium_id
      union all
      select s.id from public.condominium_structures s join descendants d on s.parent_id = d.id where s.condominium_id = new.condominium_id
    ) select 1 from descendants where id = new.parent_id) then
      raise exception 'Reparenting would create a hierarchy cycle' using errcode = '23514';
    end if;
  end if;
  if tg_op = 'UPDATE' and old.status = 'active' and new.status = 'inactive' then
    with recursive descendants(id) as (
      select id from public.condominium_structures where parent_id = new.id and condominium_id = new.condominium_id
      union all
      select s.id from public.condominium_structures s join descendants d on s.parent_id = d.id where s.condominium_id = new.condominium_id
    ) select exists(select 1 from descendants d join public.condominium_structures s on s.id = d.id where s.status = 'active')
      or exists(select 1 from public.units u where u.structure_id in (select id from descendants) and u.operational_status = 'active')
      or exists(select 1 from public.units u where u.structure_id = new.id and u.operational_status = 'active')
      into has_active_descendants;
    if has_active_descendants then raise exception 'Structure with active children or units cannot be deactivated' using errcode = '23514'; end if;
  end if;
  return new;
end $$;
create trigger condominium_structures_guard before insert or update on public.condominium_structures
for each row execute function public.guard_condominium_structure();

create or replace function public.guard_unit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(coalesce(new.condominium_id, old.condominium_id)::text, 12));
  if tg_op = 'UPDATE' and new.condominium_id is distinct from old.condominium_id then
    raise exception 'Unit tenant cannot be changed' using errcode = '23514';
  end if;
  new.code := btrim(new.code);
  new.display_name := nullif(btrim(new.display_name), '');
  if new.structure_id is not null and not exists (
    select 1 from public.condominium_structures s where s.id = new.structure_id and s.condominium_id = new.condominium_id
      and (new.operational_status <> 'active' or s.status = 'active')
  ) then raise exception 'Structure is inactive or outside condominium' using errcode = '23514'; end if;
  return new;
end $$;
create trigger units_guard before insert or update on public.units for each row execute function public.guard_unit();

create trigger condominium_structures_set_updated_at before update on public.condominium_structures for each row execute function public.set_updated_at();
create trigger units_set_updated_at before update on public.units for each row execute function public.set_updated_at();
revoke all on function public.guard_condominium_structure() from public, anon, authenticated;
revoke all on function public.guard_unit() from public, anon, authenticated;

alter table public.condominium_structures enable row level security;
alter table public.units enable row level security;
grant select, insert, update on public.condominium_structures, public.units to authenticated;
create policy condominium_structures_read on public.condominium_structures for select to authenticated
  using (public.has_permission('structures.read', condominium_id));
create policy condominium_structures_insert on public.condominium_structures for insert to authenticated
  with check (public.has_permission('structures.manage', condominium_id));
create policy condominium_structures_update on public.condominium_structures for update to authenticated
  using (public.has_permission('structures.manage', condominium_id))
  with check (public.has_permission('structures.manage', condominium_id));
create policy units_read on public.units for select to authenticated
  using (public.has_permission('units.read', condominium_id));
create policy units_insert on public.units for insert to authenticated
  with check (public.has_permission('units.manage', condominium_id));
create policy units_update on public.units for update to authenticated
  using (public.has_permission('units.manage', condominium_id))
  with check (public.has_permission('units.manage', condominium_id));

insert into public.permissions(code, description, scope) values
  ('structures.read', 'Visualizar estruturas físicas do condomínio', 'condominium'),
  ('structures.manage', 'Gerenciar estruturas físicas do condomínio', 'condominium'),
  ('units.read', 'Visualizar unidades do condomínio', 'condominium'),
  ('units.manage', 'Gerenciar unidades do condomínio', 'condominium')
on conflict (code) do nothing;
insert into public.role_permissions(role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code in ('condominium.syndic','condominium.manager')
  and p.code in ('structures.read','structures.manage','units.read','units.manage')
on conflict do nothing;

create or replace function public.audit_physical_catalog_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare entity text; entity_id uuid; condo_id uuid; event_name text; safe jsonb;
begin
  entity := case tg_table_name when 'condominium_structures' then 'condominium_structure' else 'unit' end;
  entity_id := case when tg_op = 'DELETE' then old.id else new.id end;
  condo_id := case when tg_op = 'DELETE' then old.condominium_id else new.condominium_id end;
  event_name := entity || '.' || lower(tg_op);
  if tg_op = 'INSERT' then safe := jsonb_build_object('status', case when entity = 'unit' then to_jsonb(new)->>'operational_status' else to_jsonb(new)->>'status' end);
  elsif tg_op = 'UPDATE' then
    safe := jsonb_strip_nulls(jsonb_build_object(
      'changed_fields', (select jsonb_agg(n.key) from jsonb_each(to_jsonb(new)) n join jsonb_each(to_jsonb(old)) o using (key) where n.value is distinct from o.value and n.key not in ('updated_at','notes')),
      'old_status', case when entity = 'unit' then to_jsonb(old)->>'operational_status' else to_jsonb(old)->>'status' end,
      'new_status', case when entity = 'unit' then to_jsonb(new)->>'operational_status' else to_jsonb(new)->>'status' end
    ));
  else safe := '{}'::jsonb; end if;
  insert into public.audit_events(actor_auth_user_id, actor_user_account_id, event_type, entity_type, entity_id, metadata)
  values ((select auth.uid()), public.current_user_account_id(), event_name, entity, entity_id, safe || jsonb_build_object('condominium_id', condo_id));
  return case when tg_op = 'DELETE' then old else new end;
end $$;
create trigger condominium_structures_audit after insert or update or delete on public.condominium_structures for each row execute function public.audit_physical_catalog_change();
create trigger units_audit after insert or update or delete on public.units for each row execute function public.audit_physical_catalog_change();
revoke all on function public.audit_physical_catalog_change() from public, anon, authenticated;

comment on table public.role_equivalences is 'Migration compatibility map only; not a normal RBAC assignment mechanism.';
