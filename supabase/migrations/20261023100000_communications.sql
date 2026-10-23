-- P10: comunicados do condomínio. Publicados só pelo aplicativo.
-- Quem publica: síndico e gestor. Quem lê: moradores e proprietários do condomínio.

begin;

insert into public.permissions(code, description, scope) values
  ('communications.read', 'Ler comunicados do condomínio', 'condominium'),
  ('communications.publish', 'Publicar comunicados do condomínio', 'condominium')
on conflict do nothing;

insert into public.role_permissions(role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code in ('condominium.syndic', 'condominium.manager')
  and p.code in ('communications.read', 'communications.publish')
on conflict do nothing;

insert into public.role_permissions(role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code in ('condominium.resident', 'condominium.resident_owner', 'condominium.resident_tenant')
  and p.code = 'communications.read'
on conflict do nothing;

create table public.communications (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 3 and 160),
  body text not null check (char_length(btrim(body)) between 3 and 5000),
  structure_id uuid references public.condominium_structures(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  published_by uuid references public.user_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communications_published_has_date check (status = 'draft' or published_at is not null)
);

create index communications_condominium_idx on public.communications(condominium_id, published_at desc);

create table public.communication_reads (
  communication_id uuid not null references public.communications(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  user_account_id uuid not null references public.user_accounts(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (communication_id, user_account_id)
);

alter table public.communications enable row level security;
alter table public.communication_reads enable row level security;

create policy communications_read on public.communications
  for select to authenticated
  using (public.has_permission('communications.read', condominium_id));

create policy communications_publish on public.communications
  for all to authenticated
  using (public.has_permission('communications.publish', condominium_id))
  with check (public.has_permission('communications.publish', condominium_id));

create policy communication_reads_read on public.communication_reads
  for select to authenticated
  using (public.has_permission('communications.read', condominium_id));

create policy communication_reads_insert on public.communication_reads
  for insert to authenticated
  with check (public.has_permission('communications.read', condominium_id));

commit;
