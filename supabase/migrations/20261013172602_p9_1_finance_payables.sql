begin;

create table public.condominium_finance_categories (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 120),
  kind text not null check (kind in ('payable','receivable','both')),
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (condominium_id, name)
);

create table public.condominium_payables (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  category_id uuid references public.condominium_finance_categories(id) on delete restrict,
  supplier_id uuid references public.service_providers(id) on delete restrict,
  description text not null check (length(trim(description)) between 2 and 240),
  competence_date date not null,
  due_date date not null,
  amount_cents bigint not null check (amount_cents > 0),
  status text not null default 'open' check (status in ('open','partially_paid','paid','cancelled')),
  notes text,
  created_by uuid not null default public.current_user_account_id(),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (due_date >= competence_date)
);

create index condominium_payables_scope_idx on public.condominium_payables (condominium_id, due_date, status);
create index condominium_payables_category_idx on public.condominium_payables (category_id);

alter table public.condominium_finance_categories enable row level security;
alter table public.condominium_payables enable row level security;

create policy condominium_finance_categories_read on public.condominium_finance_categories
  for select to authenticated using (public.has_permission('finance.categories.read', condominium_id));
create policy condominium_finance_categories_manage on public.condominium_finance_categories
  for all to authenticated using (public.has_permission('finance.categories.manage', condominium_id))
  with check (public.has_permission('finance.categories.manage', condominium_id));
create policy condominium_payables_read on public.condominium_payables
  for select to authenticated using (public.has_permission('finance.payables.read', condominium_id));
create policy condominium_payables_manage on public.condominium_payables
  for insert to authenticated with check (public.has_permission('finance.payables.manage', condominium_id));
create policy condominium_payables_update on public.condominium_payables
  for update to authenticated using (public.has_permission('finance.payables.manage', condominium_id))
  with check (public.has_permission('finance.payables.manage', condominium_id));

insert into public.permissions(code, description, scope) values
  ('finance.categories.read', 'Consultar categorias financeiras', 'condominium'),
  ('finance.categories.manage', 'Gerenciar categorias financeiras', 'condominium'),
  ('finance.payables.read', 'Consultar contas a pagar', 'condominium'),
  ('finance.payables.manage', 'Gerenciar contas a pagar', 'condominium')
on conflict (code) do update set description = excluded.description, scope = excluded.scope;

insert into public.role_permissions(role_id, permission_id)
select r.id, p.id
from public.roles r cross join public.permissions p
where r.code in ('condominium.syndic', 'condominium.manager')
  and p.code in ('finance.categories.read','finance.categories.manage','finance.payables.read','finance.payables.manage')
on conflict do nothing;

commit;
