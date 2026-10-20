begin;

create table public.condominium_receivables (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  category_id uuid references public.condominium_finance_categories(id) on delete restrict,
  description text not null check (length(trim(description)) between 2 and 240),
  competence_date date not null,
  due_date date not null,
  amount_cents bigint not null check (amount_cents > 0),
  status text not null default 'open' check (status in ('open','partially_received','received','cancelled')),
  notes text,
  created_by uuid not null default public.current_user_account_id(),
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (due_date >= competence_date)
);

create index condominium_receivables_scope_idx on public.condominium_receivables (condominium_id, due_date, status);
alter table public.condominium_receivables enable row level security;
create policy condominium_receivables_read on public.condominium_receivables for select to authenticated using (public.has_permission('finance.receivables.read', condominium_id));
create policy condominium_receivables_manage on public.condominium_receivables for insert to authenticated with check (public.has_permission('finance.receivables.manage', condominium_id));
create policy condominium_receivables_update on public.condominium_receivables for update to authenticated using (public.has_permission('finance.receivables.manage', condominium_id)) with check (public.has_permission('finance.receivables.manage', condominium_id));

insert into public.permissions(code, description, scope) values
  ('finance.receivables.read', 'Consultar contas a receber', 'condominium'),
  ('finance.receivables.manage', 'Gerenciar contas a receber', 'condominium')
on conflict (code) do update set description = excluded.description, scope = excluded.scope;

insert into public.role_permissions(role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code in ('condominium.syndic', 'condominium.manager')
  and p.code in ('finance.receivables.read','finance.receivables.manage')
on conflict do nothing;
commit;
