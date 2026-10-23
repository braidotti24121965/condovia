-- Atas de assembleia: rascunho, publicação e correção posterior pela administração.
-- Moradores só leem atas publicadas. Publicar não trava a edição.

begin;

create table public.assembly_minutes (
  assembly_id uuid primary key references public.assemblies(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  body text not null default '' check (char_length(body) <= 10000),
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.user_accounts(id) on delete set null,
  constraint assembly_minutes_published_has_date check (status = 'draft' or published_at is not null)
);

alter table public.assembly_minutes enable row level security;

create policy assembly_minutes_read on public.assembly_minutes for select to authenticated
  using (
    public.has_permission('assemblies.manage', condominium_id)
    or (status = 'published' and public.has_permission('assemblies.read', condominium_id))
  );

create policy assembly_minutes_manage on public.assembly_minutes for all to authenticated
  using (public.has_permission('assemblies.manage', condominium_id))
  with check (public.has_permission('assemblies.manage', condominium_id));

commit;
