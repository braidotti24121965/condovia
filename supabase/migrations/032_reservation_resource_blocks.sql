-- P5.5.1: bloqueios administrativos de recursos.
create table public.reservation_resource_blocks (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  resource_id uuid not null references public.reservable_resources(id) on delete restrict,
  start_at timestamptz not null,
  end_at timestamptz not null,
  reason text not null check (length(btrim(reason)) >= 2),
  status text not null default 'active' check (status in ('active', 'cancelled')),
  created_by_user_account_id uuid not null references public.user_accounts(id) on delete restrict,
  cancelled_at timestamptz,
  cancelled_by_user_account_id uuid references public.user_accounts(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, condominium_id),
  check (end_at > start_at)
);

alter table public.reservation_resource_blocks enable row level security;
revoke all on public.reservation_resource_blocks from public, anon, authenticated;
grant select, insert, update on public.reservation_resource_blocks to authenticated;

create policy reservation_resource_blocks_admin_read on public.reservation_resource_blocks
  for select to authenticated using (has_permission('reservations.manage', condominium_id));
create policy reservation_resource_blocks_admin_write on public.reservation_resource_blocks
  for insert to authenticated with check (has_permission('reservations.manage', condominium_id));
create policy reservation_resource_blocks_admin_update on public.reservation_resource_blocks
  for update to authenticated using (has_permission('reservations.manage', condominium_id))
  with check (has_permission('reservations.manage', condominium_id));

create or replace function public.prevent_reservation_resource_block_conflict()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  mode text;
  tz text;
begin
  if new.status <> 'active' then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended(new.resource_id::text, 29402));
  select rr.reservation_mode, c.timezone into mode, tz
  from public.reservable_resources rr join public.condominiums c on c.id = rr.condominium_id
  where rr.id = new.resource_id and rr.condominium_id = new.condominium_id;
  if exists (select 1 from public.reservations r where r.resource_id = new.resource_id and r.condominium_id = new.condominium_id and r.status in ('pending','approved') and ((mode = 'day' and (r.starts_at at time zone coalesce(tz,'America/Sao_Paulo'))::date = (new.start_at at time zone coalesce(tz,'America/Sao_Paulo'))::date) or (mode <> 'day' and tstzrange(r.starts_at,r.ends_at,'[)') && tstzrange(new.start_at,new.end_at,'[)')))) then raise exception 'Existe uma reserva ativa neste período.' using errcode = '23P01'; end if;
  if exists (select 1 from public.reservation_resource_blocks b where b.id <> new.id and b.resource_id = new.resource_id and b.condominium_id = new.condominium_id and b.status = 'active' and ((mode = 'day' and (b.start_at at time zone coalesce(tz,'America/Sao_Paulo'))::date = (new.start_at at time zone coalesce(tz,'America/Sao_Paulo'))::date) or (mode <> 'day' and tstzrange(b.start_at,b.end_at,'[)') && tstzrange(new.start_at,new.end_at,'[)')))) then raise exception 'Já existe um bloqueio neste período.' using errcode = '23P01'; end if;
  return new;
end;
$$;
revoke all on function public.prevent_reservation_resource_block_conflict() from public, anon, authenticated;
create trigger reservation_resource_blocks_guard before insert or update on public.reservation_resource_blocks for each row execute function public.prevent_reservation_resource_block_conflict();

create or replace function public.get_reservation_resource_blocks(p_condominium_id uuid, p_resource_id uuid default null)
returns table(resource_id uuid, start_at timestamptz, end_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select b.resource_id, b.start_at, b.end_at
  from public.reservation_resource_blocks b
  where b.condominium_id = p_condominium_id
    and b.status = 'active'
    and (p_resource_id is null or b.resource_id = p_resource_id)
    and public.has_permission('reservations.resources.read', b.condominium_id);
$$;
revoke all on function public.get_reservation_resource_blocks(uuid, uuid) from public, anon;
grant execute on function public.get_reservation_resource_blocks(uuid, uuid) to authenticated;
