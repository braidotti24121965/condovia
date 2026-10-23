-- Assembleias: lotes em dia por assembleia e resultado somente com totais.
-- O voto não é registrado por lote (sigilo); a administração lança apenas os totais.

begin;

-- Lotes em dia, conforme a lista enviada pela administradora antes de cada assembleia.
create table public.assembly_eligible_units (
  assembly_id uuid not null references public.assemblies(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  unit_id uuid not null references public.units(id) on delete restrict,
  primary key (assembly_id, unit_id)
);

-- Resultado da votação, somente com totais.
create table public.assembly_results (
  assembly_id uuid primary key references public.assemblies(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  present_associates integer not null check (present_associates >= 0),
  present_votes integer not null check (present_votes >= 0),
  votes_in_favor integer not null check (votes_in_favor >= 0),
  votes_against integer not null check (votes_against >= 0),
  votes_abstain integer not null check (votes_abstain >= 0),
  quorum_met boolean not null,
  approved boolean not null,
  recorded_by uuid references public.user_accounts(id) on delete set null,
  recorded_at timestamptz not null default now(),
  constraint assembly_results_votes_add_up check (votes_in_favor + votes_against + votes_abstain <= present_votes)
);

-- A tabela de votos por lote, criada na migration anterior, não deve existir.
drop table if exists public.assembly_votes;

alter table public.assembly_eligible_units enable row level security;
alter table public.assembly_results enable row level security;

create policy assembly_eligible_units_read on public.assembly_eligible_units for select to authenticated
  using (public.has_permission('assemblies.read', condominium_id));
create policy assembly_eligible_units_manage on public.assembly_eligible_units for all to authenticated
  using (public.has_permission('assemblies.manage', condominium_id))
  with check (public.has_permission('assemblies.manage', condominium_id));

create policy assembly_results_read on public.assembly_results for select to authenticated
  using (public.has_permission('assemblies.read', condominium_id));
create policy assembly_results_manage on public.assembly_results for all to authenticated
  using (public.has_permission('assemblies.manage', condominium_id))
  with check (public.has_permission('assemblies.manage', condominium_id));

commit;
