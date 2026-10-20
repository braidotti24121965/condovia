begin;

create table public.condominium_bills (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  receivable_id uuid references public.condominium_receivables(id) on delete restrict,
  reference text not null check (length(trim(reference)) between 2 and 160),
  due_date date not null,
  amount_cents bigint not null check (amount_cents > 0),
  digitable_line text check (digitable_line is null or length(trim(digitable_line)) between 3 and 120),
  status text not null default 'open' check (status in ('open','overdue','received','cancelled')),
  notes text,
  created_by uuid not null default public.current_user_account_id(),
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint condominium_bills_received_status_check check (status <> 'received' or received_at is not null)
);

create unique index condominium_bills_reference_unique_idx on public.condominium_bills (condominium_id, reference);
create index condominium_bills_scope_idx on public.condominium_bills (condominium_id, due_date, status);
create index condominium_bills_receivable_idx on public.condominium_bills (receivable_id);

alter table public.condominium_bills enable row level security;
create policy condominium_bills_read on public.condominium_bills for select to authenticated using (public.has_permission('finance.bills.read', condominium_id));
create policy condominium_bills_manage on public.condominium_bills for insert to authenticated with check (public.has_permission('finance.bills.manage', condominium_id));
create policy condominium_bills_update on public.condominium_bills for update to authenticated using (public.has_permission('finance.bills.manage', condominium_id)) with check (public.has_permission('finance.bills.manage', condominium_id));

insert into public.permissions(code, description, scope) values
  ('finance.bills.read', 'Consultar boletos', 'condominium'),
  ('finance.bills.manage', 'Gerenciar boletos', 'condominium')
on conflict (code) do update set description = excluded.description, scope = excluded.scope;

insert into public.role_permissions(role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code in ('condominium.syndic', 'condominium.manager')
  and p.code in ('finance.bills.read','finance.bills.manage')
on conflict do nothing;

commit;
