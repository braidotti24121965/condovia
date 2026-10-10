-- P8.1: maintenance foundation. This migration is intentionally limited to
-- equipment, condominium maintenance settings, permissions and auditability.

create table public.maintenance_equipment_categories (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, condominium_id),
  unique (condominium_id, name)
);

create unique index maintenance_equipment_categories_name_uidx on public.maintenance_equipment_categories(condominium_id, lower(btrim(name)));

create table public.maintenance_equipment (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  structure_id uuid not null,
  category_id uuid,
  identification text not null check (length(btrim(identification)) > 0),
  location text,
  manufacturer text,
  model text,
  serial_number text,
  installed_at date,
  warranty_until date,
  status text not null default 'active' check (status in ('active', 'inactive', 'retired')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, condominium_id),
  foreign key (structure_id, condominium_id) references public.condominium_structures(id, condominium_id) on delete restrict,
  foreign key (category_id, condominium_id) references public.maintenance_equipment_categories(id, condominium_id) on delete restrict
);

create unique index maintenance_equipment_identification_uidx on public.maintenance_equipment(condominium_id, lower(btrim(identification)));
create index maintenance_equipment_structure_idx on public.maintenance_equipment(condominium_id, structure_id, status);
create index maintenance_equipment_warranty_idx on public.maintenance_equipment(condominium_id, warranty_until)
  where warranty_until is not null;

create table public.maintenance_settings (
  condominium_id uuid primary key references public.condominiums(id) on delete cascade,
  resident_requests_enabled boolean not null default false,
  financial_approval_limit numeric(14,2) not null default 0 check (financial_approval_limit >= 0),
  alert_advance_days integer not null default 7 check (alert_advance_days between 0 and 365),
  priority_low_days integer not null default 15 check (priority_low_days > 0),
  priority_medium_days integer not null default 7 check (priority_medium_days > 0),
  priority_high_hours integer not null default 48 check (priority_high_hours > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.audit_events drop constraint audit_events_entity_type_check;
alter table public.audit_events add constraint audit_events_entity_type_check check (entity_type in (
  'user_invitation', 'condominium_membership', 'administrator_membership',
  'administrator_condominium_access', 'platform_membership', 'role_assignment',
  'permission_override', 'user_account', 'access_authorization', 'access_event',
  'access_request', 'address', 'condominium', 'condominium_structure',
  'package', 'person', 'person_condominium_link', 'person_email', 'person_phone',
  'platform_acting_context', 'unit', 'unit_occupancy', 'unit_ownership',
  'maintenance_equipment',
  'maintenance_equipment_category', 'maintenance_settings'
));

create or replace function public.guard_maintenance_equipment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.identification is not null then new.identification := btrim(new.identification); end if;
  new.location := nullif(btrim(new.location), '');
  new.manufacturer := nullif(btrim(new.manufacturer), '');
  new.model := nullif(btrim(new.model), '');
  new.serial_number := nullif(btrim(new.serial_number), '');
  if tg_op = 'UPDATE' and new.condominium_id is distinct from old.condominium_id then
    raise exception 'Equipment tenant cannot be changed' using errcode = '23514';
  end if;
  if new.status <> 'active' and old.status is distinct from new.status then
    new.updated_at := now();
  end if;
  return new;
end $$;

create or replace function public.require_active_maintenance_equipment(p_equipment_id uuid, p_condominium_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.maintenance_equipment
    where id = p_equipment_id and condominium_id = p_condominium_id and status = 'active'
  )
$$;

create trigger maintenance_equipment_guard before insert or update on public.maintenance_equipment
for each row execute function public.guard_maintenance_equipment();
create trigger maintenance_equipment_set_updated_at before update on public.maintenance_equipment
for each row execute function public.set_updated_at();
create trigger maintenance_categories_set_updated_at before update on public.maintenance_equipment_categories
for each row execute function public.set_updated_at();
create trigger maintenance_settings_set_updated_at before update on public.maintenance_settings
for each row execute function public.set_updated_at();

create or replace function public.audit_maintenance_foundation_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare entity_name text; entity_id uuid; condo_id uuid; safe jsonb;
begin
  entity_name := case tg_table_name
    when 'maintenance_equipment' then 'maintenance_equipment'
    when 'maintenance_equipment_categories' then 'maintenance_equipment_category'
    else 'maintenance_settings' end;
  entity_id := case when tg_table_name = 'maintenance_settings' then coalesce(new.condominium_id, old.condominium_id)
                    when tg_op = 'DELETE' then old.id else new.id end;
  condo_id := case when tg_op = 'DELETE' then old.condominium_id else new.condominium_id end;
  safe := jsonb_build_object('operation', tg_op, 'condominium_id', condo_id);
  if tg_op = 'UPDATE' then
    safe := safe || jsonb_build_object('old_status', to_jsonb(old)->>'status', 'new_status', to_jsonb(new)->>'status');
  end if;
  insert into public.audit_events(actor_auth_user_id, actor_user_account_id, event_type, entity_type, entity_id, metadata)
  values (auth.uid(), public.current_user_account_id(), 'maintenance.' || lower(tg_op), entity_name, entity_id, safe);
  return coalesce(new, old);
end $$;

create trigger maintenance_equipment_audit after insert or update or delete on public.maintenance_equipment
for each row execute function public.audit_maintenance_foundation_change();
create trigger maintenance_categories_audit after insert or update or delete on public.maintenance_equipment_categories
for each row execute function public.audit_maintenance_foundation_change();
create trigger maintenance_settings_audit after insert or update on public.maintenance_settings
for each row execute function public.audit_maintenance_foundation_change();

alter table public.maintenance_equipment_categories enable row level security;
alter table public.maintenance_equipment enable row level security;
alter table public.maintenance_settings enable row level security;
grant select, insert, update on public.maintenance_equipment_categories, public.maintenance_equipment, public.maintenance_settings to authenticated;

create policy maintenance_categories_read on public.maintenance_equipment_categories for select to authenticated
  using (public.has_permission('maintenance.read', condominium_id));
create policy maintenance_categories_manage on public.maintenance_equipment_categories for all to authenticated
  using (public.has_permission('maintenance.manage', condominium_id))
  with check (public.has_permission('maintenance.manage', condominium_id));
create policy maintenance_equipment_read on public.maintenance_equipment for select to authenticated
  using (public.has_permission('maintenance.read', condominium_id));
create policy maintenance_equipment_manage on public.maintenance_equipment for all to authenticated
  using (public.has_permission('maintenance.manage', condominium_id))
  with check (public.has_permission('maintenance.manage', condominium_id));
create policy maintenance_settings_read on public.maintenance_settings for select to authenticated
  using (public.has_permission('maintenance.read', condominium_id));
create policy maintenance_settings_manage on public.maintenance_settings for all to authenticated
  using (public.has_permission('maintenance.manage', condominium_id))
  with check (public.has_permission('maintenance.manage', condominium_id));

revoke all on function public.guard_maintenance_equipment() from public, anon, authenticated;
revoke all on function public.require_active_maintenance_equipment(uuid, uuid) from public, anon, authenticated;
revoke all on function public.audit_maintenance_foundation_change() from public, anon, authenticated;

insert into public.permissions(code, description, scope) values
  ('maintenance.read', 'Visualizar a estrutura básica de manutenção', 'condominium'),
  ('maintenance.manage', 'Gerenciar equipamentos e configurações de manutenção', 'condominium')
on conflict (code) do nothing;
insert into public.role_permissions(role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code in ('condominium.syndic', 'condominium.manager')
  and p.code in ('maintenance.read', 'maintenance.manage')
on conflict do nothing;
