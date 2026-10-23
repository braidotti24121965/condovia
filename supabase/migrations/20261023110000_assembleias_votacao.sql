-- Assembleias da associação (estatuto, artigos 11 a 14).
-- Quórum conta associados (pessoas); a aprovação conta votos (um por lote ou unidade).

begin;

insert into public.permissions(code, description, scope) values
  ('assemblies.read', 'Ler assembleias e resultados de votação', 'condominium'),
  ('assemblies.manage', 'Convocar assembleias, registrar presença, votos e procurações', 'condominium')
on conflict do nothing;

insert into public.role_permissions(role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code in ('condominium.syndic', 'condominium.manager', 'condominium.council')
  and p.code in ('assemblies.read', 'assemblies.manage')
on conflict do nothing;

insert into public.role_permissions(role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code in ('condominium.resident', 'condominium.resident_owner', 'condominium.resident_tenant')
  and p.code = 'assemblies.read'
on conflict do nothing;

create table public.assemblies (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 3 and 160),
  matter text not null check (matter in ('statute_change', 'member_removal', 'property_sale', 'dissolution', 'other')),
  convocation text not null default 'first' check (convocation in ('first', 'second')),
  status text not null default 'open' check (status in ('open', 'closed')),
  held_at timestamptz not null default now(),
  created_by uuid references public.user_accounts(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.assembly_attendance (
  assembly_id uuid not null references public.assemblies(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  person_id uuid not null references public.people(id) on delete restrict,
  primary key (assembly_id, person_id)
);

create table public.assembly_votes (
  assembly_id uuid not null references public.assemblies(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  unit_id uuid not null references public.units(id) on delete restrict,
  voter_person_id uuid not null references public.people(id) on delete restrict,
  choice text not null check (choice in ('in_favor', 'against', 'abstain')),
  decided_at timestamptz not null default now(),
  primary key (assembly_id, unit_id)
);

create table public.assembly_proxies (
  assembly_id uuid not null references public.assemblies(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  associate_person_id uuid not null references public.people(id) on delete restrict,
  proxy_person_id uuid not null references public.people(id) on delete restrict,
  primary key (assembly_id, associate_person_id),
  constraint assembly_proxies_not_self check (associate_person_id <> proxy_person_id)
);

create index assembly_proxies_proxy_idx on public.assembly_proxies(assembly_id, proxy_person_id);

alter table public.assemblies enable row level security;
alter table public.assembly_attendance enable row level security;
alter table public.assembly_votes enable row level security;
alter table public.assembly_proxies enable row level security;

create policy assemblies_read on public.assemblies for select to authenticated
  using (public.has_permission('assemblies.read', condominium_id));
create policy assemblies_manage on public.assemblies for all to authenticated
  using (public.has_permission('assemblies.manage', condominium_id))
  with check (public.has_permission('assemblies.manage', condominium_id));

create policy assembly_attendance_read on public.assembly_attendance for select to authenticated
  using (public.has_permission('assemblies.read', condominium_id));
create policy assembly_attendance_manage on public.assembly_attendance for all to authenticated
  using (public.has_permission('assemblies.manage', condominium_id))
  with check (public.has_permission('assemblies.manage', condominium_id));

create policy assembly_votes_read on public.assembly_votes for select to authenticated
  using (public.has_permission('assemblies.read', condominium_id));
create policy assembly_votes_manage on public.assembly_votes for all to authenticated
  using (public.has_permission('assemblies.manage', condominium_id))
  with check (public.has_permission('assemblies.manage', condominium_id));

create policy assembly_proxies_read on public.assembly_proxies for select to authenticated
  using (public.has_permission('assemblies.read', condominium_id));
create policy assembly_proxies_manage on public.assembly_proxies for all to authenticated
  using (public.has_permission('assemblies.manage', condominium_id))
  with check (public.has_permission('assemblies.manage', condominium_id));

commit;
