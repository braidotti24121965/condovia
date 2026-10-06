begin;
create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  created_by_user_account_id uuid not null references public.user_accounts(id) on delete restrict,
  entity_type text not null check (entity_type in ('structures','units','people','owners','residents')),
  file_name text not null,
  file_hash text not null,
  mapping jsonb not null default '{}'::jsonb,
  status text not null default 'preview' check (status in ('preview','confirmed','completed','rolled_back','failed')),
  total_rows integer not null default 0,
  new_rows integer not null default 0,
  duplicate_rows integer not null default 0,
  invalid_rows integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  completed_at timestamptz,
  unique (condominium_id, file_hash)
);
create table public.import_batch_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.import_batches(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  row_number integer not null,
  classification text not null check (classification in ('new','duplicate','invalid')),
  normalized_data jsonb not null default '{}'::jsonb,
  message text,
  entity_id uuid,
  created_at timestamptz not null default now(),
  unique (batch_id, row_number)
);
create index import_batches_condo_created_idx on public.import_batches(condominium_id, created_at desc);
create index import_batch_rows_batch_idx on public.import_batch_rows(batch_id, row_number);
alter table public.import_batches enable row level security;
alter table public.import_batch_rows enable row level security;
grant select, insert, update on public.import_batches, public.import_batch_rows to authenticated;
create policy import_batches_read on public.import_batches for select to authenticated using (public.has_permission('imports.read', condominium_id));
create policy import_batches_manage on public.import_batches for insert to authenticated with check (public.has_permission('imports.manage', condominium_id));
create policy import_batches_update on public.import_batches for update to authenticated using (public.has_permission('imports.manage', condominium_id)) with check (public.has_permission('imports.manage', condominium_id));
create policy import_batch_rows_read on public.import_batch_rows for select to authenticated using (public.has_permission('imports.read', condominium_id));
create policy import_batch_rows_manage on public.import_batch_rows for insert to authenticated with check (public.has_permission('imports.manage', condominium_id));
insert into public.permissions(code, description, scope) values
 ('imports.read','Consultar importações','condominium'),
 ('imports.manage','Executar importações','condominium')
on conflict (code) do nothing;
insert into public.role_permissions(role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code in ('condominium.syndic','condominium.manager') and p.code in ('imports.read','imports.manage')
on conflict do nothing;

create or replace function public.confirm_import_batch(p_batch_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare b public.import_batches%rowtype; r record; new_id uuid; created_count integer := 0;
begin
  select * into b from public.import_batches where id=p_batch_id for update;
  if b.id is null or not public.has_permission('imports.manage',b.condominium_id) then raise exception 'Lote não encontrado ou sem permissão.' using errcode='42501'; end if;
  if b.status <> 'preview' then raise exception 'Lote já confirmado.' using errcode='23514'; end if;
  for r in select * from public.import_batch_rows where batch_id=b.id and classification='new' order by row_number loop
    if b.entity_type='structures' then
      insert into public.condominium_structures(condominium_id,parent_id,structure_type,name,code,sort_order,status)
      values (b.condominium_id,(r.normalized_data->>'parent_id')::uuid,r.normalized_data->>'structure_type',r.normalized_data->>'name',nullif(r.normalized_data->>'code',''),coalesce((r.normalized_data->>'sort_order')::integer,0),'active') returning id into new_id;
    elsif b.entity_type='units' then
      insert into public.units(condominium_id,structure_id,code,display_name,unit_type,floor,operational_status)
      values (b.condominium_id,(r.normalized_data->>'structure_id')::uuid,r.normalized_data->>'code',nullif(r.normalized_data->>'display_name',''),coalesce(r.normalized_data->>'unit_type','apartment'),nullif(r.normalized_data->>'floor',''),'active') returning id into new_id;
    elsif b.entity_type='people' then
      insert into public.people(full_name,preferred_name,birth_date,status) values (r.normalized_data->>'full_name',nullif(r.normalized_data->>'preferred_name',''),nullif(r.normalized_data->>'birth_date','')::date,'active') returning id into new_id;
      insert into public.person_condominium_links(condominium_id,person_id,status) values (b.condominium_id,new_id,'active');
    elsif b.entity_type in ('owners','residents') then
      if b.entity_type='owners' then
        insert into public.unit_ownerships(condominium_id,unit_id,person_id,ownership_percentage,starts_at,ends_at) values (b.condominium_id,(r.normalized_data->>'unit_id')::uuid,(r.normalized_data->>'person_id')::uuid,nullif(r.normalized_data->>'ownership_percentage','')::numeric,coalesce(nullif(r.normalized_data->>'starts_at','')::date,current_date),nullif(r.normalized_data->>'ends_at','')::date) returning id into new_id;
      else
        insert into public.unit_occupancies(condominium_id,unit_id,person_id,occupancy_type,is_primary,starts_at,ends_at) values (b.condominium_id,(r.normalized_data->>'unit_id')::uuid,(r.normalized_data->>'person_id')::uuid,coalesce(nullif(r.normalized_data->>'occupancy_type',''),'other'),false,coalesce(nullif(r.normalized_data->>'starts_at','')::date,current_date),nullif(r.normalized_data->>'ends_at','')::date) returning id into new_id;
      end if;
    end if;
    update public.import_batch_rows set entity_id=new_id where id=r.id;
    created_count := created_count + 1;
  end loop;
  update public.import_batches set status='completed',new_rows=created_count,confirmed_at=now(),completed_at=now() where id=b.id;
  return jsonb_build_object('created',created_count,'batch_id',b.id);
exception when others then
  update public.import_batches set status='rolled_back',error_message=sqlerrm,confirmed_at=now() where id=p_batch_id;
  raise;
end $$;
revoke all on function public.confirm_import_batch(uuid) from public, anon;
grant execute on function public.confirm_import_batch(uuid) to authenticated;
commit;
