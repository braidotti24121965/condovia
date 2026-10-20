begin;

alter table public.condominium_payables
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references public.user_accounts(id),
  add column if not exists cancellation_reason text;

alter table public.condominium_receivables
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references public.user_accounts(id),
  add column if not exists cancellation_reason text;

create table public.condominium_payments (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  payable_id uuid references public.condominium_payables(id) on delete restrict,
  receivable_id uuid references public.condominium_receivables(id) on delete restrict,
  amount_cents bigint not null check (amount_cents > 0),
  paid_on date not null,
  method text not null check (method in ('pix','boleto','transferencia','dinheiro','cartao','outro')),
  notes text,
  created_by uuid not null default public.current_user_account_id() references public.user_accounts(id),
  created_at timestamptz not null default now(),
  reversed_at timestamptz,
  reversed_by uuid references public.user_accounts(id),
  reversal_reason text,
  check ((payable_id is not null and receivable_id is null) or (payable_id is null and receivable_id is not null)),
  check ((reversed_at is null and reversed_by is null and reversal_reason is null) or (reversed_at is not null and reversed_by is not null and length(trim(reversal_reason)) >= 3))
);

create index condominium_payments_condominium_idx on public.condominium_payments(condominium_id);
create index condominium_payments_payable_idx on public.condominium_payments(payable_id) where payable_id is not null;
create index condominium_payments_receivable_idx on public.condominium_payments(receivable_id) where receivable_id is not null;

create table public.condominium_finance_events (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  entity_type text not null check (entity_type in ('payable','receivable','payment')),
  entity_id uuid not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid not null default public.current_user_account_id() references public.user_accounts(id),
  created_at timestamptz not null default now()
);

create index condominium_finance_events_entity_idx on public.condominium_finance_events(condominium_id, entity_type, entity_id, created_at);

alter table public.condominium_payments enable row level security;
alter table public.condominium_finance_events enable row level security;

create policy condominium_payments_read on public.condominium_payments for select to authenticated using (
  public.has_permission('finance.payables.read', condominium_id) or public.has_permission('finance.receivables.read', condominium_id)
);
create policy condominium_payments_insert on public.condominium_payments for insert to authenticated with check (
  (payable_id is not null and public.has_permission('finance.payables.manage', condominium_id))
  or (receivable_id is not null and public.has_permission('finance.receivables.manage', condominium_id))
);
create policy condominium_payments_update on public.condominium_payments for update to authenticated using (
  public.has_permission('finance.payables.manage', condominium_id) or public.has_permission('finance.receivables.manage', condominium_id)
) with check (
  public.has_permission('finance.payables.manage', condominium_id) or public.has_permission('finance.receivables.manage', condominium_id)
);
create policy condominium_finance_events_read on public.condominium_finance_events for select to authenticated using (
  (entity_type in ('payable','payment') and public.has_permission('finance.payables.read', condominium_id))
  or (entity_type = 'receivable' and public.has_permission('finance.receivables.read', condominium_id))
);

revoke delete on public.condominium_payments, public.condominium_finance_events from authenticated;

create or replace function public.register_finance_payment(
  p_kind text, p_entry_id uuid, p_amount_cents bigint, p_paid_on date, p_method text, p_notes text default null
) returns public.condominium_payments
language plpgsql security definer set search_path = public, pg_catalog
as $$
declare
  v_account uuid := public.current_user_account_id();
  v_condominium uuid;
  v_total bigint;
  v_paid bigint;
  v_payment public.condominium_payments;
begin
  if p_amount_cents is null or p_amount_cents <= 0 or p_paid_on is null or p_method not in ('pix','boleto','transferencia','dinheiro','cartao','outro') then
    raise exception 'Pagamento inválido' using errcode = '22023';
  end if;
  if p_kind = 'payable' then
    select condominium_id, amount_cents into v_condominium, v_total from public.condominium_payables where id = p_entry_id and status in ('open','partially_paid') for update;
    if v_condominium is null or not public.has_permission('finance.payables.manage', v_condominium) then raise exception 'Conta a pagar não autorizada' using errcode = '42501'; end if;
    select coalesce(sum(amount_cents), 0) into v_paid from public.condominium_payments where payable_id = p_entry_id and reversed_at is null;
    if v_paid + p_amount_cents > v_total then raise exception 'Pagamento excede o saldo da conta' using errcode = '22003'; end if;
    insert into public.condominium_payments(condominium_id,payable_id,amount_cents,paid_on,method,notes,created_by) values(v_condominium,p_entry_id,p_amount_cents,p_paid_on,p_method,nullif(btrim(p_notes),''),v_account) returning * into v_payment;
    update public.condominium_payables set status = case when v_paid + p_amount_cents = v_total then 'paid' else 'partially_paid' end, paid_at = case when v_paid + p_amount_cents = v_total then now() else null end, updated_at = now() where id = p_entry_id;
  elsif p_kind = 'receivable' then
    select condominium_id, amount_cents into v_condominium, v_total from public.condominium_receivables where id = p_entry_id and status in ('open','partially_received') for update;
    if v_condominium is null or not public.has_permission('finance.receivables.manage', v_condominium) then raise exception 'Conta a receber não autorizada' using errcode = '42501'; end if;
    select coalesce(sum(amount_cents), 0) into v_paid from public.condominium_payments where receivable_id = p_entry_id and reversed_at is null;
    if v_paid + p_amount_cents > v_total then raise exception 'Pagamento excede o saldo da conta' using errcode = '22003'; end if;
    insert into public.condominium_payments(condominium_id,receivable_id,amount_cents,paid_on,method,notes,created_by) values(v_condominium,p_entry_id,p_amount_cents,p_paid_on,p_method,nullif(btrim(p_notes),''),v_account) returning * into v_payment;
    update public.condominium_receivables set status = case when v_paid + p_amount_cents = v_total then 'received' else 'partially_received' end, received_at = case when v_paid + p_amount_cents = v_total then now() else null end, updated_at = now() where id = p_entry_id;
  else raise exception 'Tipo de conta inválido' using errcode = '22023';
  end if;
  insert into public.condominium_finance_events(condominium_id,entity_type,entity_id,event_type,payload,created_by) values(v_condominium,p_kind,p_entry_id,'payment_registered',jsonb_build_object('payment_id',v_payment.id,'amount_cents',p_amount_cents,'paid_on',p_paid_on,'method',p_method),v_account);
  return v_payment;
end;
$$;

create or replace function public.reverse_finance_payment(p_payment_id uuid, p_reason text)
returns public.condominium_payments language plpgsql security definer set search_path = public, pg_catalog
as $$
declare v_payment public.condominium_payments; v_account uuid := public.current_user_account_id(); v_total bigint; v_paid bigint; v_condominium uuid; v_kind text; v_entry uuid;
begin
  if length(btrim(coalesce(p_reason,''))) < 3 then raise exception 'Motivo do estorno é obrigatório' using errcode = '22023'; end if;
  select * into v_payment from public.condominium_payments where id = p_payment_id for update;
  if not found or v_payment.reversed_at is not null then raise exception 'Pagamento inválido ou já estornado' using errcode = '22023'; end if;
  v_condominium := v_payment.condominium_id; v_kind := case when v_payment.payable_id is not null then 'payable' else 'receivable' end; v_entry := coalesce(v_payment.payable_id, v_payment.receivable_id);
  if not public.has_permission(case when v_kind = 'payable' then 'finance.payables.manage' else 'finance.receivables.manage' end, v_condominium) then raise exception 'Pagamento não autorizado' using errcode = '42501'; end if;
  update public.condominium_payments set reversed_at = now(), reversed_by = v_account, reversal_reason = btrim(p_reason) where id = p_payment_id returning * into v_payment;
  if v_kind = 'payable' then
    select amount_cents into v_total from public.condominium_payables where id = v_entry for update;
    select coalesce(sum(amount_cents),0) into v_paid from public.condominium_payments where payable_id = v_entry and reversed_at is null;
    update public.condominium_payables set status = case when v_paid = 0 then 'open' when v_paid < v_total then 'partially_paid' else 'paid' end, paid_at = case when v_paid = v_total then paid_at else null end, updated_at = now() where id = v_entry;
  else
    select amount_cents into v_total from public.condominium_receivables where id = v_entry for update;
    select coalesce(sum(amount_cents),0) into v_paid from public.condominium_payments where receivable_id = v_entry and reversed_at is null;
    update public.condominium_receivables set status = case when v_paid = 0 then 'open' when v_paid < v_total then 'partially_received' else 'received' end, received_at = case when v_paid = v_total then received_at else null end, updated_at = now() where id = v_entry;
  end if;
  insert into public.condominium_finance_events(condominium_id,entity_type,entity_id,event_type,payload,created_by) values(v_condominium,'payment',p_payment_id,'payment_reversed',jsonb_build_object('reason',p_reason),v_account);
  return v_payment;
end;
$$;

create or replace function public.cancel_finance_entry(p_kind text, p_entry_id uuid, p_reason text)
returns boolean language plpgsql security definer set search_path = public, pg_catalog
as $$
declare v_condominium uuid; v_account uuid := public.current_user_account_id(); v_active bigint;
begin
  if length(btrim(coalesce(p_reason,''))) < 3 then raise exception 'Motivo do cancelamento é obrigatório' using errcode = '22023'; end if;
  if p_kind = 'payable' then
    select condominium_id into v_condominium from public.condominium_payables where id=p_entry_id and status in ('open','partially_paid') for update;
  elsif p_kind = 'receivable' then
    select condominium_id into v_condominium from public.condominium_receivables where id=p_entry_id and status in ('open','partially_received') for update;
  else raise exception 'Tipo de conta inválido' using errcode = '22023'; end if;
  if v_condominium is null or not public.has_permission(case when p_kind='payable' then 'finance.payables.manage' else 'finance.receivables.manage' end,v_condominium) then raise exception 'Conta não autorizada' using errcode = '42501'; end if;
  select count(*) into v_active from public.condominium_payments where (payable_id=p_entry_id or receivable_id=p_entry_id) and reversed_at is null;
  if v_active > 0 then raise exception 'Não é possível cancelar uma conta com pagamentos ativos' using errcode = '23514'; end if;
  if p_kind='payable' then update public.condominium_payables set status='cancelled',cancelled_at=now(),cancelled_by=v_account,cancellation_reason=btrim(p_reason),updated_at=now() where id=p_entry_id;
  else update public.condominium_receivables set status='cancelled',cancelled_at=now(),cancelled_by=v_account,cancellation_reason=btrim(p_reason),updated_at=now() where id=p_entry_id; end if;
  insert into public.condominium_finance_events(condominium_id,entity_type,entity_id,event_type,payload,created_by) values(v_condominium,p_kind,p_entry_id,'entry_cancelled',jsonb_build_object('reason',p_reason),v_account);
  return true;
end;
$$;

revoke all on function public.register_finance_payment(text,uuid,bigint,date,text,text) from public, anon, authenticated;
revoke all on function public.reverse_finance_payment(uuid,text) from public, anon, authenticated;
revoke all on function public.cancel_finance_entry(text,uuid,text) from public, anon, authenticated;
grant execute on function public.register_finance_payment(text,uuid,bigint,date,text,text) to authenticated;
grant execute on function public.reverse_finance_payment(uuid,text) to authenticated;
grant execute on function public.cancel_finance_entry(text,uuid,text) to authenticated;

commit;
