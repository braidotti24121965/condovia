-- Equipamentos de controle de acesso e campos de origem em access_events.
-- Migration para revisão: não aplicada. Não altera event_type nem a regra de alvo (visitante ou prestador);
-- essas mudanças dependem de decisão registrada em controle-acesso-desenho-interno.md, seção 6.

begin;

create table public.access_devices (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  access_point_id uuid not null references public.access_points(id) on delete restrict,
  manufacturer text not null check (char_length(btrim(manufacturer)) between 2 and 60),
  model text not null check (char_length(btrim(model)) between 2 and 60),
  firmware text check (firmware is null or char_length(firmware) <= 60),
  status text not null default 'active' check (status in ('active', 'inactive')),
  -- Referência ao segredo guardado fora do banco. Nunca a credencial em si.
  integration_secret_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index access_devices_condominium_idx on public.access_devices(condominium_id);

alter table public.access_devices enable row level security;

create policy "access_devices_read" on public.access_devices
  for select to authenticated
  using (
    has_permission('gatehouse.read', condominium_id) or
    has_permission('gatehouse.operate', condominium_id) or
    has_permission('structures.read', condominium_id)
  );

create policy "access_devices_manage" on public.access_devices
  for all to authenticated
  using (has_permission('structures.manage', condominium_id))
  with check (has_permission('structures.manage', condominium_id));

alter table public.access_events
  add column if not exists source text not null default 'manual' check (source in ('manual', 'device')),
  add column if not exists device_id uuid references public.access_devices(id) on delete restrict,
  add column if not exists external_event_id text,
  add column if not exists decision text not null default 'granted' check (decision in ('granted', 'denied', 'unknown')),
  add column if not exists denial_reason text,
  add column if not exists attempt_id text,
  add column if not exists recognition_method text check (recognition_method is null or recognition_method in ('face', 'card', 'qr', 'password', 'other'));

-- Evento de equipamento precisa de identificação do equipamento e do evento, para não duplicar.
alter table public.access_events
  add constraint access_events_device_source_complete check (
    source = 'manual' or (device_id is not null and external_event_id is not null)
  );

create unique index access_events_device_event_unique
  on public.access_events(device_id, external_event_id)
  where external_event_id is not null;

commit;
