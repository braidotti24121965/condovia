begin;

alter table public.condominium_receivables
  add column if not exists unit_id uuid,
  add column if not exists payer_person_id uuid;

alter table public.condominium_receivables
  add constraint condominium_receivables_unit_condominium_fk
    foreign key (unit_id, condominium_id)
    references public.units (id, condominium_id)
    on delete restrict;

alter table public.condominium_receivables
  add constraint condominium_receivables_payer_condominium_fk
    foreign key (payer_person_id, condominium_id)
    references public.person_condominium_links (person_id, condominium_id)
    on delete restrict;

create index condominium_receivables_condominium_unit_idx
  on public.condominium_receivables (condominium_id, unit_id);
create index condominium_receivables_condominium_payer_idx
  on public.condominium_receivables (condominium_id, payer_person_id);

create or replace function public.validate_receivable_unit_payer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  local_today date;
  reference_date date;
begin
  if new.unit_id is null then
    if new.payer_person_id is not null then
      raise exception 'O pagador exige uma unidade vinculada.' using errcode = '23514';
    end if;
    return new;
  end if;

  select timezone(c.timezone, pg_catalog.now())::date
    into local_today
    from public.condominiums c
   where c.id = new.condominium_id;
  reference_date := coalesce(new.competence_date, local_today);

  if not exists (
    select 1 from public.units u
     where u.id = new.unit_id
       and u.condominium_id = new.condominium_id
       and u.operational_status = 'active'
  ) then
    raise exception 'A unidade não pertence a este condomínio ou não está ativa.' using errcode = '23514';
  end if;

  if new.payer_person_id is not null and not exists (
    select 1 from public.unit_financial_responsibilities r
     where r.unit_id = new.unit_id
       and r.condominium_id = new.condominium_id
       and r.person_id = new.payer_person_id
       and r.starts_at <= reference_date
       and (r.ends_at is null or r.ends_at > reference_date)
    union all
    select 1 from public.unit_ownerships o
     where o.unit_id = new.unit_id
       and o.condominium_id = new.condominium_id
       and o.person_id = new.payer_person_id
       and o.starts_at <= reference_date
       and (o.ends_at is null or o.ends_at > reference_date)
  ) then
    raise exception 'O pagador não está vinculado à unidade na competência informada.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger condominium_receivables_unit_payer_guard
before insert or update of unit_id, payer_person_id, competence_date, condominium_id
on public.condominium_receivables
for each row execute function public.validate_receivable_unit_payer();

create or replace function public.prevent_finance_paid_edit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if to_jsonb(old) - array['status','paid_at','received_at','cancelled_at','cancelled_by','cancellation_reason','updated_at']::text[]
     is distinct from to_jsonb(new) - array['status','paid_at','received_at','cancelled_at','cancelled_by','cancellation_reason','updated_at']::text[] then
    if old.status in ('cancelled','paid','received') then
      raise exception 'Conta encerrada não pode ser editada' using errcode = '23514';
    end if;
    if exists (
      select 1 from public.condominium_payments p
       where (p.payable_id = old.id or p.receivable_id = old.id)
         and p.reversed_at is null
    ) then
      raise exception 'Conta com pagamentos não pode ser editada' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

grant update(unit_id, payer_person_id) on public.condominium_receivables to authenticated;

create or replace function public.get_unit_financial_responsible(p_unit_id uuid, p_date date)
returns table (person_id uuid, full_name text)
language sql
stable
security definer
set search_path = ''
as $$
  with target as (
    select u.condominium_id
      from public.units u
     where u.id = p_unit_id
  ), responsible as (
    select r.person_id, 1 as priority
      from public.unit_financial_responsibilities r
      join target t on t.condominium_id = r.condominium_id
     where r.unit_id = p_unit_id
       and r.starts_at <= p_date
       and (r.ends_at is null or r.ends_at > p_date)
    union all
    select o.person_id, 2
      from public.unit_ownerships o
      join target t on t.condominium_id = o.condominium_id
     where o.unit_id = p_unit_id
       and o.starts_at <= p_date
       and (o.ends_at is null or o.ends_at > p_date)
  )
  select r.person_id, p.full_name
    from responsible r
    join public.people p on p.id = r.person_id
   where exists (select 1 from target t where public.has_permission('finance.receivables.read', t.condominium_id))
     and p.status = 'active'
   order by r.priority, p.full_name
   limit 1;
$$;

revoke all on function public.get_unit_financial_responsible(uuid, date) from public, anon;
grant execute on function public.get_unit_financial_responsible(uuid, date) to authenticated;

commit;
