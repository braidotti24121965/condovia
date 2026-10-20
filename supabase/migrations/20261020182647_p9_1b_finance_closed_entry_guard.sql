begin;

create or replace function public.prevent_finance_paid_edit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status in ('cancelled', 'paid', 'received')
     and (to_jsonb(old) - array['status', 'paid_at', 'received_at', 'cancelled_at', 'cancelled_by', 'cancellation_reason', 'updated_at'])
         is distinct from
         (to_jsonb(new) - array['status', 'paid_at', 'received_at', 'cancelled_at', 'cancelled_by', 'cancellation_reason', 'updated_at']) then
    raise exception 'Conta encerrada não pode ser editada' using errcode = '23514';
  end if;

  if (old.amount_cents, old.competence_date, old.due_date) is distinct from (new.amount_cents, new.competence_date, new.due_date)
     and exists (
       select 1
       from public.condominium_payments p
       where (p.payable_id = old.id or p.receivable_id = old.id)
         and p.reversed_at is null
     ) then
    raise exception 'Conta com pagamentos não pode ser editada' using errcode = '23514';
  end if;

  return new;
end;
$$;

commit;
