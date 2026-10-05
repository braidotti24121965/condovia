-- P5.1: reservable resources and recurring local availability.

create table public.reservable_resources (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  name text not null check (length(btrim(name)) >= 2),
  description text,
  location text,
  capacity integer check (capacity is null or capacity > 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  requires_approval boolean not null default true,
  minimum_advance_minutes integer not null default 0 check (minimum_advance_minutes >= 0),
  maximum_advance_minutes integer check (maximum_advance_minutes is null or maximum_advance_minutes >= minimum_advance_minutes),
  minimum_duration_minutes integer not null default 30 check (minimum_duration_minutes >= 0),
  maximum_duration_minutes integer check (maximum_duration_minutes is null or maximum_duration_minutes >= minimum_duration_minutes),
  buffer_minutes integer not null default 0 check (buffer_minutes >= 0),
  cancellation_allowed boolean not null default true,
  cancellation_deadline_minutes integer not null default 0 check (cancellation_deadline_minutes >= 0),
  usage_fee numeric(12,2) check (usage_fee is null or usage_fee >= 0),
  instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, condominium_id)
);

create index reservable_resources_condo_status_idx on public.reservable_resources(condominium_id, status, name);

create table public.reservable_resource_hours (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null,
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resource_hours_resource_fk foreign key (resource_id, condominium_id)
    references public.reservable_resources(id, condominium_id) on delete cascade,
  constraint resource_hours_order_ck check (start_time < end_time)
);

create index reservable_resource_hours_resource_day_idx
  on public.reservable_resource_hours(resource_id, weekday, start_time);

create or replace function public.prevent_reservable_hour_overlap()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.reservable_resource_hours h
    where h.resource_id = new.resource_id
      and h.weekday = new.weekday
      and h.active = true
      and h.id <> coalesce(new.id, gen_random_uuid())
      and new.active = true
      and new.start_time < h.end_time
      and new.end_time > h.start_time
  ) then
    raise exception 'Horário de disponibilidade sobreposto para este recurso';
  end if;
  return new;
end;
$$;

create trigger reservable_resource_hours_no_overlap
before insert or update on public.reservable_resource_hours
for each row execute function public.prevent_reservable_hour_overlap();

insert into public.permissions (code, description, scope)
values
  ('reservations.resources.read', 'Permite consultar recursos reserváveis', 'condominium'),
  ('reservations.resources.manage', 'Permite administrar recursos reserváveis e disponibilidade', 'condominium')
on conflict (code) do update set description = excluded.description, scope = excluded.scope;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code in ('condominium.syndic', 'condominium.manager', 'condominium.doorman', 'condominium.resident', 'condominium.resident_owner', 'condominium.resident_tenant')
  and p.code = 'reservations.resources.read'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code in ('condominium.syndic', 'condominium.manager')
  and p.code = 'reservations.resources.manage'
on conflict do nothing;

alter table public.reservable_resources enable row level security;
alter table public.reservable_resource_hours enable row level security;

create policy reservable_resources_read on public.reservable_resources
  for select to authenticated
  using (has_permission('reservations.resources.read', condominium_id));

create policy reservable_resources_insert on public.reservable_resources
  for insert to authenticated
  with check (has_permission('reservations.resources.manage', condominium_id));

create policy reservable_resources_update on public.reservable_resources
  for update to authenticated
  using (has_permission('reservations.resources.manage', condominium_id))
  with check (has_permission('reservations.resources.manage', condominium_id));

create policy reservable_resources_hours_read on public.reservable_resource_hours
  for select to authenticated
  using (has_permission('reservations.resources.read', condominium_id));

create policy reservable_resources_hours_insert on public.reservable_resource_hours
  for insert to authenticated
  with check (has_permission('reservations.resources.manage', condominium_id));

create policy reservable_resources_hours_update on public.reservable_resource_hours
  for update to authenticated
  using (has_permission('reservations.resources.manage', condominium_id))
  with check (has_permission('reservations.resources.manage', condominium_id));

create policy reservable_resources_hours_delete on public.reservable_resource_hours
  for delete to authenticated
  using (has_permission('reservations.resources.manage', condominium_id));

revoke all on public.reservable_resources from public, anon;
revoke all on public.reservable_resource_hours from public, anon;
grant select, insert, update on public.reservable_resources to authenticated;
grant select, insert, update, delete on public.reservable_resource_hours to authenticated;

comment on column public.reservable_resources.minimum_advance_minutes is 'Durations and lead times are integer minutes; recurring availability remains local time.';
