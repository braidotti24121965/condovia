-- P5.2: núcleo transacional de reservas.
create extension if not exists btree_gist;

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  resource_id uuid not null,
  unit_id uuid not null,
  requester_person_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null check (status in ('pending','approved','rejected','cancelled')),
  notes text,
  usage_fee numeric(12,2) check (usage_fee is null or usage_fee >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at),
  foreign key (resource_id, condominium_id) references public.reservable_resources(id, condominium_id),
  foreign key (unit_id, condominium_id) references public.units(id, condominium_id),
  foreign key (requester_person_id, condominium_id) references public.person_condominium_links(person_id, condominium_id)
);

grant select, insert, update on public.reservations to authenticated;
revoke delete on public.reservations from authenticated;

create index reservations_condo_time_idx on public.reservations(condominium_id, starts_at);
create index reservations_requester_idx on public.reservations(requester_person_id, starts_at);
alter table public.reservations add constraint reservations_active_no_overlap
  exclude using gist (resource_id with =, tstzrange(starts_at, ends_at, '[)') with &&)
  where (status in ('pending','approved'));

insert into public.permissions (code, description, scope) values
  ('reservations.read', 'Visualizar reservas do condomínio', 'condominium'),
  ('reservations.create', 'Criar reservas permitidas', 'condominium')
on conflict (code) do update set description = excluded.description, scope = excluded.scope;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code in ('condominium.syndic','condominium.manager','condominium.resident','condominium.resident_owner','condominium.resident_tenant')
  and p.code = 'reservations.read' on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code in ('condominium.syndic','condominium.manager')
  and p.code = 'reservations.create' on conflict do nothing;

alter table public.reservations enable row level security;
create policy reservations_read on public.reservations for select to authenticated using (
  has_permission('reservations.read', condominium_id)
  or (requester_person_id = current_person_id() and has_condominium_access(condominium_id))
);
create policy reservations_insert on public.reservations for insert to authenticated with check (
  has_permission('reservations.create', condominium_id)
  or (requester_person_id = current_person_id() and exists (select 1 from public.unit_occupancies o where o.unit_id = reservations.unit_id and o.condominium_id = reservations.condominium_id and o.person_id = reservations.requester_person_id and o.starts_at <= current_date and (o.ends_at is null or o.ends_at > current_date)))
);
create policy reservations_update on public.reservations for update to authenticated using (
  has_permission('reservations.create', condominium_id) or requester_person_id = current_person_id()
) with check (has_permission('reservations.create', condominium_id) or requester_person_id = current_person_id());

create or replace function public.prevent_reservation_scope_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.condominium_id is distinct from old.condominium_id
    or new.resource_id is distinct from old.resource_id
    or new.unit_id is distinct from old.unit_id
    or new.requester_person_id is distinct from old.requester_person_id then
    raise exception 'Reservation tenant, resource, unit and requester are immutable' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_reservation_scope_change() from public, anon, authenticated;
create trigger reservations_scope_guard
before update on public.reservations
for each row execute function public.prevent_reservation_scope_change();
