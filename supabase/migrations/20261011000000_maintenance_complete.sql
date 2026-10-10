-- Completes P8 without rewriting migrations already applied. Ordered after P8.3.
begin;
create schema if not exists maintenance_private;
revoke all on schema maintenance_private from public, anon, authenticated;

alter table public.service_providers drop constraint service_providers_document_type_check;
alter table public.service_providers add constraint service_providers_document_type_check check (document_type is null or document_type in ('cpf','cnpj','rg','cnh','passport','other'));
alter table public.service_providers add column email text, add column address text;
alter table public.maintenance_settings add column financial_approval_enabled boolean not null default true;

insert into public.permissions(code,description,scope) values
 ('maintenance.finance.read','Consultar custos e aprovações da manutenção','condominium'),
 ('maintenance.finance.manage','Gerenciar orçamento, cotações e custos','condominium'),
 ('maintenance.finance.approve','Decidir aprovações financeiras de manutenção','condominium'),
 ('maintenance.contracts.manage','Gerenciar fornecedores e contratos de manutenção','condominium'),
 ('maintenance.documents.read','Consultar documentos de manutenção','condominium'),
 ('maintenance.documents.manage','Anexar documentos de manutenção','condominium'),
 ('maintenance.plans.manage','Gerenciar manutenção preventiva','condominium') on conflict do nothing;
insert into public.roles(code,name,scope,scope_type) values ('condominium.council','Conselho','condominium','condominium') on conflict do nothing;
insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r cross join public.permissions p where r.code in ('condominium.syndic','condominium.manager') and p.code in ('maintenance.finance.read','maintenance.finance.manage','maintenance.finance.approve','maintenance.contracts.manage','maintenance.documents.read','maintenance.documents.manage','maintenance.plans.manage') on conflict do nothing;
insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r cross join public.permissions p where r.code='condominium.council' and p.code in ('context.read','maintenance.read','maintenance.orders.read','maintenance.finance.read','maintenance.finance.approve','maintenance.documents.read') on conflict do nothing;

create table public.maintenance_service_types (
 id uuid primary key default gen_random_uuid(), condominium_id uuid not null references public.condominiums(id),
 name text not null check(length(btrim(name)) between 2 and 120), contract_required boolean not null default false,
 status text not null default 'active' check(status in ('active','inactive')), unique(id,condominium_id), unique(condominium_id,name)
);
create table public.maintenance_contracts (
 id uuid primary key default gen_random_uuid(), condominium_id uuid not null references public.condominiums(id),
 service_provider_id uuid not null, title text not null check(length(btrim(title)) between 3 and 180),
 starts_on date not null, ends_on date not null, amount numeric(14,2) not null check(amount>=0),
 status text not null default 'draft' check(status in ('draft','active','expired','cancelled')),
 notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(id,condominium_id), check(ends_on>=starts_on), foreign key(service_provider_id,condominium_id) references public.service_providers(id,condominium_id)
);
create table public.maintenance_approval_rules (
 id uuid primary key default gen_random_uuid(), condominium_id uuid not null references public.condominiums(id),
 name text not null check(length(btrim(name)) between 2 and 120), minimum_amount numeric(14,2) not null check(minimum_amount>=0),
 maximum_amount numeric(14,2), role_id uuid not null references public.roles(id), required_approvals integer not null default 1 check(required_approvals between 1 and 20),
 active boolean not null default true, check(maximum_amount is null or maximum_amount>=minimum_amount), unique(id,condominium_id)
);
create table public.maintenance_document_requirements (
 id uuid primary key default gen_random_uuid(), condominium_id uuid not null references public.condominiums(id), service_type_id uuid not null,
 document_kind text not null check(document_kind in ('contract','proposal','invoice','report','certificate','warranty','receipt','photo','other')),
 required_before text not null check(required_before in ('start','complete')),
 foreign key(service_type_id,condominium_id) references public.maintenance_service_types(id,condominium_id), unique(service_type_id,document_kind,required_before)
);
create table public.maintenance_plans (
 id uuid primary key default gen_random_uuid(), condominium_id uuid not null references public.condominiums(id),
 structure_id uuid not null, equipment_id uuid, service_type_id uuid, service_provider_id uuid, contract_id uuid,
 responsible_user_account_id uuid references public.user_accounts(id), description text not null check(length(btrim(description)) between 3 and 10000),
 interval_days integer not null check(interval_days between 1 and 3660), next_due_on date not null, advance_days integer not null default 7 check(advance_days between 0 and 365),
 estimated_amount numeric(14,2) not null default 0 check(estimated_amount>=0), checklist_template text[] not null default '{}',
 status text not null default 'active' check(status in ('active','paused','ended')), created_by uuid not null references public.user_accounts(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(id,condominium_id), foreign key(structure_id,condominium_id) references public.condominium_structures(id,condominium_id),
 foreign key(equipment_id,condominium_id) references public.maintenance_equipment(id,condominium_id),
 foreign key(service_type_id,condominium_id) references public.maintenance_service_types(id,condominium_id),
 foreign key(service_provider_id,condominium_id) references public.service_providers(id,condominium_id),
 foreign key(contract_id,condominium_id) references public.maintenance_contracts(id,condominium_id)
);
alter table public.maintenance_work_orders
 add column service_type_id uuid, add column contract_id uuid, add column occurrence_id uuid,
 add column maintenance_kind text not null default 'corrective' check(maintenance_kind in ('corrective','preventive','inspection','improvement')),
 add column actual_cost_recorded boolean not null default false, add column scheduled_on date, add column estimated_amount numeric(14,2) not null default 0 check(estimated_amount>=0),
 add column approved_amount numeric(14,2) check(approved_amount>=0), add column actual_amount numeric(14,2) not null default 0 check(actual_amount>=0),
 add column financial_revision integer not null default 1, add column approved_revision integer,
 add column selected_quotation_id uuid, add column plan_id uuid, add column plan_due_on date,
 add foreign key(service_type_id,condominium_id) references public.maintenance_service_types(id,condominium_id),
 add foreign key(contract_id,condominium_id) references public.maintenance_contracts(id,condominium_id),
 add foreign key(occurrence_id,condominium_id) references public.occurrences(id,condominium_id),
 add foreign key(plan_id,condominium_id) references public.maintenance_plans(id,condominium_id), add unique(plan_id,plan_due_on);
create table public.maintenance_quotations (
 id uuid primary key default gen_random_uuid(), condominium_id uuid not null references public.condominiums(id), work_order_id uuid not null,
 service_provider_id uuid not null, amount numeric(14,2) not null check(amount>=0), description text not null check(length(btrim(description)) between 3 and 10000),
 valid_until date not null, status text not null default 'submitted' check(status in ('submitted','selected','rejected','withdrawn')),
 created_at timestamptz not null default now(), unique(id,condominium_id),
 foreign key(work_order_id,condominium_id) references public.maintenance_work_orders(id,condominium_id),
 foreign key(service_provider_id,condominium_id) references public.service_providers(id,condominium_id)
);
alter table public.maintenance_work_orders add foreign key(selected_quotation_id,condominium_id) references public.maintenance_quotations(id,condominium_id);
create table public.maintenance_approval_steps (
 id uuid primary key default gen_random_uuid(), condominium_id uuid not null references public.condominiums(id), work_order_id uuid not null,
 revision integer not null, amount numeric(14,2) not null, role_id uuid not null references public.roles(id),
 required_approvals integer not null check(required_approvals between 1 and 20), rule_name text not null,
 requested_by uuid not null references public.user_accounts(id), created_at timestamptz not null default now(),
 unique(id,condominium_id), foreign key(work_order_id,condominium_id) references public.maintenance_work_orders(id,condominium_id)
);
create table public.maintenance_approval_decisions (
 id uuid primary key default gen_random_uuid(), condominium_id uuid not null references public.condominiums(id), step_id uuid not null,
 decided_by uuid not null references public.user_accounts(id), decided_by_name text not null, decision text not null check(decision in ('approved','rejected')),
 reason text not null check(length(btrim(reason)) between 3 and 2000), created_at timestamptz not null default now(),
 unique(step_id,decided_by), foreign key(step_id,condominium_id) references public.maintenance_approval_steps(id,condominium_id)
);
create table public.maintenance_checklist_items (
 id uuid primary key default gen_random_uuid(), condominium_id uuid not null references public.condominiums(id), work_order_id uuid not null,
 description text not null check(length(btrim(description)) between 2 and 500), required boolean not null default true,
 completed boolean not null default false, completed_at timestamptz, completed_by uuid references public.user_accounts(id),
 foreign key(work_order_id,condominium_id) references public.maintenance_work_orders(id,condominium_id),
 check(completed=(completed_at is not null and completed_by is not null))
);
create table public.maintenance_documents (
 id uuid primary key default gen_random_uuid(), condominium_id uuid not null references public.condominiums(id),
 work_order_id uuid, contract_id uuid, equipment_id uuid, quotation_id uuid,
 title text not null check(length(btrim(title)) between 2 and 180), document_kind text not null check(document_kind in ('contract','proposal','invoice','report','certificate','warranty','receipt','photo','other')),
 created_at timestamptz not null default now(), unique(id,condominium_id), check(num_nonnulls(work_order_id,contract_id,equipment_id,quotation_id)=1),
 foreign key(work_order_id,condominium_id) references public.maintenance_work_orders(id,condominium_id),
 foreign key(contract_id,condominium_id) references public.maintenance_contracts(id,condominium_id),
 foreign key(equipment_id,condominium_id) references public.maintenance_equipment(id,condominium_id),
 foreign key(quotation_id,condominium_id) references public.maintenance_quotations(id,condominium_id)
);
create table public.maintenance_document_versions (
 id uuid primary key default gen_random_uuid(), condominium_id uuid not null references public.condominiums(id), document_id uuid not null,
 version integer not null check(version>0), object_path text not null unique, original_filename text not null, mime_type text not null,
 size_bytes bigint not null check(size_bytes>0 and size_bytes<=10485760), uploaded_by uuid not null references public.user_accounts(id), created_at timestamptz not null default now(),
 unique(document_id,version), foreign key(document_id,condominium_id) references public.maintenance_documents(id,condominium_id)
);
create table public.maintenance_expenses (
 id uuid primary key default gen_random_uuid(), condominium_id uuid not null references public.condominiums(id), work_order_id uuid not null unique,
 service_provider_id uuid, amount numeric(14,2) not null check(amount>0), status text not null default 'pending_finance' check(status in ('pending_finance','exported')),
 created_at timestamptz not null default now(), exported_at timestamptz,
 foreign key(work_order_id,condominium_id) references public.maintenance_work_orders(id,condominium_id),
 foreign key(service_provider_id,condominium_id) references public.service_providers(id,condominium_id)
);

-- Fine-grained reads; all business mutations go through authenticated RPCs.
do $$ declare t text; permission text; begin
 foreach t in array array['maintenance_service_types','maintenance_contracts','maintenance_approval_rules','maintenance_document_requirements','maintenance_plans','maintenance_quotations','maintenance_approval_steps','maintenance_approval_decisions','maintenance_checklist_items','maintenance_documents','maintenance_document_versions','maintenance_expenses'] loop
  permission:=case when t='maintenance_plans' then 'maintenance.plans.manage' when t='maintenance_approval_rules' then 'maintenance.manage' when t in ('maintenance_contracts','maintenance_quotations','maintenance_approval_steps','maintenance_approval_decisions','maintenance_expenses') then 'maintenance.finance.read' when t in ('maintenance_documents','maintenance_document_versions') then 'maintenance.documents.read' else 'maintenance.read' end;
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('create policy %I on public.%I for select to authenticated using (public.has_permission(%L, condominium_id))',t||'_read',t,permission);
  execute format('create index %I on public.%I(condominium_id)',t||'_tenant_idx',t);
 end loop;
end $$;
create index maintenance_plan_due_idx on public.maintenance_plans(next_due_on) where status='active';
create index maintenance_approval_order_idx on public.maintenance_approval_steps(work_order_id,revision);
create index maintenance_documents_order_idx on public.maintenance_documents(work_order_id);

create or replace function maintenance_private.require_permission(p_condo uuid,p_permission text) returns void
language plpgsql security definer set search_path='' as $$ begin
 if auth.uid() is null or public.current_user_account_id() is null or public.has_permission(p_permission,p_condo) is distinct from true then raise exception 'Permissão negada' using errcode='42501'; end if;
end $$;
create or replace function maintenance_private.today(p_condo uuid) returns date language sql stable security definer set search_path='' as $$ select (now() at time zone coalesce((select timezone from public.condominiums where id=p_condo),'America/Sao_Paulo'))::date $$;

create or replace function maintenance_private.order_event(p_order uuid,p_event text,p_reason text default null) returns void
language plpgsql security definer set search_path='' as $$ begin
 insert into public.maintenance_work_order_history(work_order_id,condominium_id,event_type,previous_status,new_status,reason,actor_user_account_id)
 select id,condominium_id,p_event,status,status,p_reason,public.current_user_account_id() from public.maintenance_work_orders where id=p_order;
end $$;
alter table public.maintenance_work_order_history drop constraint maintenance_work_order_history_event_type_check;
alter table public.maintenance_work_order_history add constraint maintenance_work_order_history_event_type_check check(event_type in ('created','assigned','started','submitted_for_validation','validated','cancelled','activity_updated','details_updated','quotation_selected','approval_requested','financial_approved','financial_rejected','document_uploaded','checklist_updated','scheduled'));

-- Audit new entities using metadata rather than storing file contents or contact PII.
do $$ declare c text; begin
 select pg_get_constraintdef(oid) into c from pg_constraint where conrelid='public.audit_events'::regclass and conname='audit_events_entity_type_check';
 execute 'alter table public.audit_events drop constraint audit_events_entity_type_check';
 c:=replace(c,'''maintenance_settings''','''maintenance_settings'', ''maintenance_contract'', ''maintenance_plan'', ''maintenance_quotation'', ''maintenance_approval'', ''maintenance_document'', ''maintenance_expense'', ''maintenance_rule'', ''maintenance_checklist''');
 execute 'alter table public.audit_events add constraint audit_events_entity_type_check '||c;
end $$;
create or replace function maintenance_private.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
declare row_data jsonb:=coalesce(to_jsonb(new),to_jsonb(old)); kind text; begin
 kind:=case tg_table_name when 'maintenance_contracts' then 'maintenance_contract' when 'maintenance_plans' then 'maintenance_plan' when 'maintenance_quotations' then 'maintenance_quotation' when 'maintenance_approval_steps' then 'maintenance_approval' when 'maintenance_approval_decisions' then 'maintenance_approval' when 'maintenance_documents' then 'maintenance_document' when 'maintenance_document_versions' then 'maintenance_document' when 'maintenance_expenses' then 'maintenance_expense' when 'maintenance_checklist_items' then 'maintenance_checklist' else 'maintenance_rule' end;
 insert into public.audit_events(actor_auth_user_id,actor_user_account_id,event_type,entity_type,entity_id,metadata)
 values(auth.uid(),public.current_user_account_id(),'maintenance.'||lower(tg_op),kind,(row_data->>'id')::uuid,jsonb_build_object('condominium_id',row_data->>'condominium_id','table',tg_table_name,'amount',row_data->>'amount','decision',row_data->>'decision'));
 return coalesce(new,old);
end $$;
do $$ declare t text; begin foreach t in array array['maintenance_service_types','maintenance_contracts','maintenance_approval_rules','maintenance_document_requirements','maintenance_plans','maintenance_quotations','maintenance_approval_steps','maintenance_approval_decisions','maintenance_documents','maintenance_document_versions','maintenance_expenses','maintenance_checklist_items'] loop
 execute format('create trigger %I after insert or update on public.%I for each row execute function maintenance_private.audit_change()',t||'_audit',t);
end loop; end $$;


-- Official CNPJ DV algorithm (ASCII minus 48), compatible with numeric identifiers.
-- Source: Receita Federal / documentos-tecnicos/cnpj/manual-dv-cnpj.pdf.
create or replace function maintenance_private.valid_supplier_cnpj(value text) returns boolean language plpgsql immutable set search_path='' as $$
declare normalized text:=upper(regexp_replace(coalesce(value,''),'[^0-9A-Za-z]','','g')); a integer[]:=array[5,4,3,2,9,8,7,6,5,4,3,2]; b integer[]:=array[6,5,4,3,2,9,8,7,6,5,4,3,2]; total integer:=0; first_dv integer; second_dv integer; i integer; begin
 if normalized !~ '^[A-Z0-9]{12}[0-9]{2}$' or normalized ~ '^(.)\1{13}$' then return false; end if;
 for i in 1..12 loop total:=total+(ascii(substr(normalized,i,1))-48)*a[i]; end loop;
 first_dv:=case when total%11<2 then 0 else 11-total%11 end; total:=0;
 for i in 1..12 loop total:=total+(ascii(substr(normalized,i,1))-48)*b[i]; end loop;
 total:=total+first_dv*2; second_dv:=case when total%11<2 then 0 else 11-total%11 end;
 return substr(normalized,13,2)=first_dv::text||second_dv::text;
end $$;

create or replace function public.save_maintenance_provider(p_condominium_id uuid,p_id uuid,p_name text,p_company text,p_document_type text,p_document text,p_phone text,p_email text,p_address text,p_service_type text,p_status text) returns uuid
language plpgsql security definer set search_path='' as $$ declare v_id uuid; digits text; begin
 perform maintenance_private.require_permission(p_condominium_id,'maintenance.contracts.manage');
 if p_status not in ('active','inactive') then raise exception 'Situação inválida'; end if;
 digits:=upper(regexp_replace(coalesce(p_document,''),'[^0-9A-Za-z]','','g'));
 if digits<>'' then perform pg_advisory_xact_lock(hashtextextended(p_condominium_id::text||':'||coalesce(p_document_type,'')||':'||digits,811)); if exists(select 1 from public.service_providers sp where sp.condominium_id=p_condominium_id and sp.id is distinct from p_id and sp.document_type=p_document_type and upper(regexp_replace(coalesce(sp.document_number,''),'[^0-9A-Za-z]','','g'))=digits) then raise exception 'Documento já cadastrado; reutilize o fornecedor existente'; end if; end if;
 if p_document_type='cnpj' and digits<>'' and not maintenance_private.valid_supplier_cnpj(digits) then raise exception 'CNPJ inválido'; end if;
 if p_document_type='cpf' and digits<>'' and not public.is_valid_cpf(digits) then raise exception 'CPF inválido'; end if;
 if nullif(p_email,'') is not null and p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'E-mail inválido'; end if;
 if p_id is not null then
  update public.service_providers set full_name=btrim(p_name),company_name=nullif(btrim(p_company),''),document_type=p_document_type,document_number=nullif(digits,''),phone=nullif(p_phone,''),email=nullif(p_email,''),address=nullif(p_address,''),service_type=nullif(p_service_type,''),status=p_status,updated_by=public.current_user_account_id() where id=p_id and condominium_id=p_condominium_id returning id into v_id;
 else
  insert into public.service_providers(condominium_id,full_name,company_name,document_type,document_number,phone,email,address,service_type,status,created_by) values(p_condominium_id,btrim(p_name),nullif(p_company,''),p_document_type,nullif(digits,''),nullif(p_phone,''),nullif(p_email,''),nullif(p_address,''),nullif(p_service_type,''),p_status,public.current_user_account_id()) returning id into v_id;
 end if;
 if v_id is null then raise exception 'Prestador inacessível'; end if; return v_id;
end $$;

create or replace function public.save_maintenance_contract(p_condominium_id uuid,p_id uuid,p_provider uuid,p_title text,p_start date,p_end date,p_amount numeric,p_status text,p_notes text) returns uuid
language plpgsql security definer set search_path='' as $$ declare v_id uuid; begin
 perform maintenance_private.require_permission(p_condominium_id,'maintenance.contracts.manage');
 if not exists(select 1 from public.service_providers where id=p_provider and condominium_id=p_condominium_id and status='active') then raise exception 'Prestador inválido'; end if;
 if p_id is not null then
  -- Active contracts with execution or approval cannot silently change their legal snapshot.
  if exists(select 1 from public.maintenance_work_orders where contract_id=p_id and (status in ('in_progress','awaiting_validation','completed') or approved_revision is not null)) and exists(select 1 from public.maintenance_contracts where id=p_id and condominium_id=p_condominium_id and (service_provider_id,starts_on,ends_on,amount,title) is distinct from (p_provider,p_start,p_end,p_amount,btrim(p_title))) then raise exception 'Contrato utilizado: crie novo contrato/aditivo e preserve o histórico'; end if;
  update public.maintenance_contracts set service_provider_id=p_provider,title=btrim(p_title),starts_on=p_start,ends_on=p_end,amount=p_amount,status=p_status,notes=nullif(p_notes,''),updated_at=now() where id=p_id and condominium_id=p_condominium_id returning id into v_id;
 else insert into public.maintenance_contracts(condominium_id,service_provider_id,title,starts_on,ends_on,amount,status,notes) values(p_condominium_id,p_provider,btrim(p_title),p_start,p_end,p_amount,p_status,nullif(p_notes,'')) returning id into v_id; end if;
 if v_id is null then raise exception 'Contrato inacessível'; end if; return v_id;
end $$;

create or replace function public.save_maintenance_service_type(p_condominium_id uuid,p_id uuid,p_name text,p_contract_required boolean,p_status text) returns uuid
language plpgsql security definer set search_path='' as $$ declare v_id uuid; begin
 perform maintenance_private.require_permission(p_condominium_id,'maintenance.manage');
 if p_id is null then insert into public.maintenance_service_types(condominium_id,name,contract_required,status) values(p_condominium_id,btrim(p_name),p_contract_required,p_status) returning id into v_id;
 else update public.maintenance_service_types set name=btrim(p_name),contract_required=p_contract_required,status=p_status where id=p_id and condominium_id=p_condominium_id returning id into v_id; end if;
 if v_id is null then raise exception 'Tipo inacessível'; end if; return v_id;
end $$;
create or replace function public.save_maintenance_approval_rule(p_condominium_id uuid,p_id uuid,p_name text,p_minimum numeric,p_maximum numeric,p_role uuid,p_quorum integer,p_active boolean) returns uuid
language plpgsql security definer set search_path='' as $$ declare v_id uuid; begin
 perform maintenance_private.require_permission(p_condominium_id,'maintenance.manage');
 if not exists(select 1 from public.roles r join public.role_permissions rp on rp.role_id=r.id join public.permissions p on p.id=rp.permission_id where r.id=p_role and r.scope_type='condominium' and r.status='active' and p.code='maintenance.finance.approve') then raise exception 'Perfil sem permissão de aprovação financeira'; end if;
 if p_id is null then insert into public.maintenance_approval_rules(condominium_id,name,minimum_amount,maximum_amount,role_id,required_approvals,active) values(p_condominium_id,p_name,p_minimum,p_maximum,p_role,p_quorum,p_active) returning id into v_id;
 else update public.maintenance_approval_rules set name=p_name,minimum_amount=p_minimum,maximum_amount=p_maximum,role_id=p_role,required_approvals=p_quorum,active=p_active where id=p_id and condominium_id=p_condominium_id returning id into v_id; end if;
 if v_id is null then raise exception 'Alçada inacessível'; end if; return v_id;
end $$;
create or replace function public.save_maintenance_document_requirement(p_condominium_id uuid,p_service_type uuid,p_kind text,p_before text,p_remove boolean default false) returns void
language plpgsql security definer set search_path='' as $$ begin
 perform maintenance_private.require_permission(p_condominium_id,'maintenance.manage');
 if p_remove then delete from public.maintenance_document_requirements where condominium_id=p_condominium_id and service_type_id=p_service_type and document_kind=p_kind and required_before=p_before;
 else insert into public.maintenance_document_requirements(condominium_id,service_type_id,document_kind,required_before) values(p_condominium_id,p_service_type,p_kind,p_before) on conflict do nothing; end if;
end $$;

create or replace function public.update_maintenance_order_details(p_order uuid,p_kind text,p_service_type uuid,p_contract uuid,p_provider uuid,p_occurrence uuid,p_estimated numeric,p_actual numeric,p_scheduled date) returns void
language plpgsql security definer set search_path='' as $$ declare v public.maintenance_work_orders%rowtype; begin
 select * into v from public.maintenance_work_orders where id=p_order for update;
 perform maintenance_private.require_permission(v.condominium_id,'maintenance.finance.manage');
 if v.status in ('completed','cancelled') then raise exception 'OS encerrada não pode ser alterada'; end if;
 if p_provider is not null and not exists(select 1 from public.service_providers where id=p_provider and condominium_id=v.condominium_id and status='active') then raise exception 'Prestador inválido'; end if;
 if p_contract is not null and not exists(select 1 from public.maintenance_contracts where id=p_contract and condominium_id=v.condominium_id and service_provider_id=p_provider and status='active' and maintenance_private.today(v.condominium_id) between starts_on and ends_on) then raise exception 'Contrato inválido ou fora de vigência'; end if;
 if p_occurrence is not null and not public.has_permission('occurrences.read',v.condominium_id) then raise exception 'Sem permissão para vincular ocorrência' using errcode='42501'; end if;
 update public.maintenance_work_orders set maintenance_kind=p_kind,service_type_id=p_service_type,contract_id=p_contract,service_provider_id=p_provider,occurrence_id=p_occurrence,estimated_amount=p_estimated,actual_amount=p_actual,actual_cost_recorded=true,scheduled_on=p_scheduled,
 selected_quotation_id=case when (estimated_amount,service_provider_id) is distinct from (p_estimated,p_provider) then null else selected_quotation_id end,
 financial_revision=financial_revision+case when (estimated_amount,service_provider_id,contract_id,service_type_id) is distinct from (p_estimated,p_provider,p_contract,p_service_type) or p_actual>coalesce(approved_amount,estimated_amount) then 1 else 0 end,
 approved_revision=case when (estimated_amount,service_provider_id,contract_id,service_type_id) is distinct from (p_estimated,p_provider,p_contract,p_service_type) or p_actual>coalesce(approved_amount,estimated_amount) then null else approved_revision end,
 approved_amount=case when (estimated_amount,service_provider_id,contract_id,service_type_id) is distinct from (p_estimated,p_provider,p_contract,p_service_type) or p_actual>coalesce(approved_amount,estimated_amount) then null else approved_amount end
 where id=v.id;
 perform maintenance_private.order_event(p_order,'details_updated','Dados de contratação, orçamento ou agenda atualizados');
end $$;

create or replace function public.save_maintenance_quotation(p_order uuid,p_provider uuid,p_amount numeric,p_description text,p_valid_until date) returns uuid
language plpgsql security definer set search_path='' as $$ declare v public.maintenance_work_orders%rowtype; result uuid; begin
 select * into v from public.maintenance_work_orders where id=p_order for update;
 perform maintenance_private.require_permission(v.condominium_id,'maintenance.finance.manage');
 if v.status in ('completed','cancelled') then raise exception 'OS encerrada'; end if;
 if p_valid_until<maintenance_private.today(v.condominium_id) then raise exception 'Cotação vencida'; end if;
 if not exists(select 1 from public.service_providers where id=p_provider and condominium_id=v.condominium_id and status='active') then raise exception 'Prestador inválido'; end if;
 insert into public.maintenance_quotations(condominium_id,work_order_id,service_provider_id,amount,description,valid_until) values(v.condominium_id,v.id,p_provider,p_amount,p_description,p_valid_until) returning id into result; return result;
end $$;
create or replace function public.select_maintenance_quotation(p_quotation uuid) returns void
language plpgsql security definer set search_path='' as $$ declare q public.maintenance_quotations%rowtype; v public.maintenance_work_orders%rowtype; begin
 select * into q from public.maintenance_quotations where id=p_quotation;
 select * into v from public.maintenance_work_orders where id=q.work_order_id for update;
 perform maintenance_private.require_permission(v.condominium_id,'maintenance.finance.manage');
 if v.status in ('completed','cancelled') or q.valid_until<maintenance_private.today(v.condominium_id) or q.status not in ('submitted','selected') then raise exception 'Cotação indisponível ou OS encerrada'; end if;
 if v.selected_quotation_id=q.id then return; end if;
 if not exists(select 1 from public.service_providers where id=q.service_provider_id and status='active') then raise exception 'Prestador inativo'; end if;
 update public.maintenance_quotations set status='submitted' where work_order_id=v.id and status='selected';
 update public.maintenance_quotations set status='selected' where id=q.id;
 update public.maintenance_work_orders set selected_quotation_id=q.id,estimated_amount=q.amount,service_provider_id=q.service_provider_id,contract_id=case when service_provider_id=q.service_provider_id then contract_id else null end,financial_revision=financial_revision+1,approved_revision=null,approved_amount=null where id=v.id;
 perform maintenance_private.order_event(v.id,'quotation_selected','Cotação selecionada; exige autorização financeira');
end $$;

create or replace function public.request_maintenance_financial_approval(p_order uuid) returns void
language plpgsql security definer set search_path='' as $$ declare v public.maintenance_work_orders%rowtype; matched integer; role_uuid uuid; begin
 select * into v from public.maintenance_work_orders where id=p_order for update;
 perform maintenance_private.require_permission(v.condominium_id,'maintenance.finance.manage');
 if v.status in ('completed','cancelled') then raise exception 'OS encerrada'; end if;
 if greatest(v.estimated_amount,v.actual_amount)<=0 then raise exception 'Informe o valor antes de solicitar aprovação'; end if;
 if exists(select 1 from public.maintenance_approval_steps where work_order_id=v.id and revision=v.financial_revision) then
  if not exists(select 1 from public.maintenance_approval_decisions d join public.maintenance_approval_steps s on s.id=d.step_id where s.work_order_id=v.id and s.revision=v.financial_revision and d.decision='rejected') then return; end if;
  update public.maintenance_work_orders set financial_revision=financial_revision+1,approved_revision=null,approved_amount=null where id=v.id returning * into v;
 end if;
 insert into public.maintenance_approval_steps(condominium_id,work_order_id,revision,amount,role_id,required_approvals,rule_name,requested_by)
 select v.condominium_id,v.id,v.financial_revision,greatest(v.estimated_amount,v.actual_amount),r.role_id,r.required_approvals,r.name,public.current_user_account_id()
 from public.maintenance_approval_rules r where r.condominium_id=v.condominium_id and r.active and greatest(v.estimated_amount,v.actual_amount)>=r.minimum_amount and (r.maximum_amount is null or greatest(v.estimated_amount,v.actual_amount)<=r.maximum_amount);
 get diagnostics matched=row_count;
 if matched=0 then
  select id into role_uuid from public.roles where code='condominium.syndic' and status='active';
  insert into public.maintenance_approval_steps(condominium_id,work_order_id,revision,amount,role_id,required_approvals,rule_name,requested_by) values(v.condominium_id,v.id,v.financial_revision,greatest(v.estimated_amount,v.actual_amount),role_uuid,1,'Alçada padrão: Síndico',public.current_user_account_id());
  if greatest(v.estimated_amount,v.actual_amount)>coalesce((select financial_approval_limit from public.maintenance_settings where condominium_id=v.condominium_id),0) then
   select id into role_uuid from public.roles where code='condominium.council' and status='active';
   insert into public.maintenance_approval_steps(condominium_id,work_order_id,revision,amount,role_id,required_approvals,rule_name,requested_by) values(v.condominium_id,v.id,v.financial_revision,greatest(v.estimated_amount,v.actual_amount),role_uuid,1,'Acima do limite: Conselho',public.current_user_account_id());
  end if;
 end if;
 perform maintenance_private.order_event(v.id,'approval_requested','Solicitada aprovação da revisão '||v.financial_revision);
 -- Recipients must have a current role, membership and permission; no JWT user_metadata.
 insert into public.notifications(condominium_id,recipient_user_account_id,notification_type,title,message,entity_type,entity_id)
 select distinct v.condominium_id,ra.user_account_id,'maintenance_financial_approval_requested','Aprovação financeira pendente','OS #'||v.work_order_number||' · revisão '||v.financial_revision,'maintenance_approval_step',s.id
 from public.maintenance_approval_steps s join public.role_assignments ra on ra.role_id=s.role_id and ra.condominium_id=s.condominium_id and ra.status='active' and ra.starts_at<=now() and (ra.ends_at is null or ra.ends_at>now())
 join public.user_accounts ua on ua.id=ra.user_account_id and ua.status='active'
 where s.work_order_id=v.id and s.revision=v.financial_revision on conflict do nothing;
end $$;
create or replace function public.decide_maintenance_financial_approval(p_step uuid,p_decision text,p_reason text) returns void
language plpgsql security definer set search_path='' as $$ declare s public.maintenance_approval_steps%rowtype; v public.maintenance_work_orders%rowtype; actor uuid:=public.current_user_account_id(); begin
 select * into s from public.maintenance_approval_steps where id=p_step;
 select * into v from public.maintenance_work_orders where id=s.work_order_id for update;
 perform maintenance_private.require_permission(v.condominium_id,'maintenance.finance.approve');
 if s.revision<>v.financial_revision or v.status in ('completed','cancelled') then raise exception 'Aprovação substituída ou OS encerrada'; end if;
 if v.approved_revision=v.financial_revision then raise exception 'Revisão já aprovada'; end if;
 if exists(select 1 from public.maintenance_approval_decisions d join public.maintenance_approval_steps x on x.id=d.step_id where x.work_order_id=v.id and x.revision=v.financial_revision and d.decision='rejected') then raise exception 'Revisão rejeitada; solicite nova aprovação'; end if;
 if not exists(select 1 from public.role_assignments ra join public.roles r on r.id=ra.role_id and r.status='active' where ra.user_account_id=actor and ra.role_id=s.role_id and ra.condominium_id=v.condominium_id and ra.status='active' and ra.starts_at<=now() and (ra.ends_at is null or ra.ends_at>now())) then raise exception 'Perfil fora da alçada exigida' using errcode='42501'; end if;
 if exists(select 1 from public.maintenance_approval_decisions d join public.maintenance_approval_steps x on x.id=d.step_id where x.work_order_id=v.id and x.revision=v.financial_revision and d.decided_by=actor) then raise exception 'Cada aprovador pode decidir uma única vez por revisão'; end if;
 insert into public.maintenance_approval_decisions(condominium_id,step_id,decided_by,decided_by_name,decision,reason) values(v.condominium_id,s.id,actor,(select coalesce(nullif(p.preferred_name,''),p.full_name) from public.people p join public.user_accounts ua on ua.person_id=p.id where ua.id=actor),p_decision,btrim(p_reason));
 if p_decision='rejected' then
  update public.maintenance_work_orders set approved_revision=null,approved_amount=null where id=v.id;
  perform maintenance_private.order_event(v.id,'financial_rejected',p_reason);
 elsif not exists(select 1 from public.maintenance_approval_steps x where x.work_order_id=v.id and x.revision=v.financial_revision and (select count(*) from public.maintenance_approval_decisions d where d.step_id=x.id and d.decision='approved')<x.required_approvals) then
  update public.maintenance_work_orders set approved_revision=financial_revision,approved_amount=s.amount where id=v.id;
  perform maintenance_private.order_event(v.id,'financial_approved',p_reason);
 end if;
end $$;

create or replace function public.save_maintenance_checklist(p_order uuid,p_item uuid,p_description text,p_required boolean,p_completed boolean) returns void
language plpgsql security definer set search_path='' as $$ declare v public.maintenance_work_orders%rowtype; begin
 select * into v from public.maintenance_work_orders where id=p_order for update;
 perform maintenance_private.require_permission(v.condominium_id,case when p_item is null then 'maintenance.orders.manage' else 'maintenance.orders.update' end);
 if v.status in ('completed','cancelled') then raise exception 'OS encerrada'; end if;
 if p_item is null then insert into public.maintenance_checklist_items(condominium_id,work_order_id,description,required) values(v.condominium_id,v.id,p_description,p_required);
 else update public.maintenance_checklist_items set completed=p_completed,completed_at=case when p_completed then now() else null end,completed_by=case when p_completed then public.current_user_account_id() else null end where id=p_item and work_order_id=v.id; if not found then raise exception 'Item inacessível'; end if; end if;
 perform maintenance_private.order_event(v.id,'checklist_updated',p_description);
end $$;

create or replace function maintenance_private.assert_order_ready(p_order uuid,p_phase text) returns void
language plpgsql security definer set search_path='' as $$ declare v public.maintenance_work_orders%rowtype; contract_required boolean; begin
 select * into v from public.maintenance_work_orders where id=p_order;
 if coalesce((select financial_approval_enabled from public.maintenance_settings where condominium_id=v.condominium_id),true) and greatest(v.estimated_amount,v.actual_amount)>0 and (v.approved_revision is distinct from v.financial_revision or coalesce(v.approved_amount,-1)<greatest(v.estimated_amount,v.actual_amount)) then raise exception 'Aprovação financeira pendente para o valor e revisão atuais' using errcode='23514'; end if;
 if v.service_provider_id is not null and not exists(select 1 from public.service_providers where id=v.service_provider_id and condominium_id=v.condominium_id and status='active') then raise exception 'Prestador inativo' using errcode='23514'; end if;
 select t.contract_required into contract_required from public.maintenance_service_types t where t.id=v.service_type_id;
 if contract_required and v.contract_id is null then raise exception 'Este serviço exige contrato' using errcode='23514'; end if;
 if v.contract_id is not null and not exists(select 1 from public.maintenance_contracts c where c.id=v.contract_id and c.condominium_id=v.condominium_id and c.service_provider_id=v.service_provider_id and c.status='active' and maintenance_private.today(v.condominium_id) between c.starts_on and c.ends_on) then raise exception 'Contrato fora de vigência ou incompatível' using errcode='23514'; end if;
 if exists(select 1 from public.maintenance_document_requirements r where r.service_type_id=v.service_type_id and (r.required_before=p_phase or (p_phase='complete' and r.required_before='start')) and not exists(select 1 from public.maintenance_documents d join public.maintenance_document_versions dv on dv.document_id=d.id join storage.objects o on o.bucket_id='maintenance-documents' and o.name=dv.object_path where d.condominium_id=v.condominium_id and d.document_kind=r.document_kind and (d.work_order_id=v.id or d.contract_id=v.contract_id or d.equipment_id=v.equipment_id or d.quotation_id=v.selected_quotation_id))) then raise exception 'Documentação obrigatória ausente' using errcode='23514'; end if;
 if p_phase='complete' and greatest(v.estimated_amount,v.actual_amount)>0 and not v.actual_cost_recorded then raise exception 'Registre o custo efetivo antes da conclusão' using errcode='23514'; end if;
 if p_phase='complete' and exists(select 1 from public.maintenance_checklist_items where work_order_id=v.id and required and not completed) then raise exception 'Checklist obrigatório incompleto' using errcode='23514'; end if;
end $$;

-- Preserve P8.3 state machine and add prerequisites around its existing transitions.
alter function public.transition_maintenance_work_order(uuid,text,text,uuid) rename to transition_maintenance_work_order_p83;
revoke all on function public.transition_maintenance_work_order_p83(uuid,text,text,uuid) from public,anon,authenticated;
create or replace function public.transition_maintenance_work_order(p_work_order_id uuid,p_action text,p_reason text default null,p_responsible_user_account_id uuid default null) returns public.maintenance_work_orders
language plpgsql security definer set search_path='' as $$ declare v public.maintenance_work_orders%rowtype; begin
 select * into v from public.maintenance_work_orders where id=p_work_order_id for update;
 perform maintenance_private.require_permission(v.condominium_id,case when p_action in ('assign','validate','cancel') then 'maintenance.orders.manage' else 'maintenance.orders.update' end);
 if p_action='start' then perform maintenance_private.assert_order_ready(v.id,'start'); end if;
 if p_action in ('submit_validation','validate') then perform maintenance_private.assert_order_ready(v.id,'complete'); end if;
 select * into v from public.transition_maintenance_work_order_p83(p_work_order_id,p_action,p_reason,p_responsible_user_account_id);
 if p_action='validate' and v.actual_amount>0 then insert into public.maintenance_expenses(condominium_id,work_order_id,service_provider_id,amount) values(v.condominium_id,v.id,v.service_provider_id,v.actual_amount) on conflict(work_order_id) do nothing; end if;
 if not public.has_permission('maintenance.finance.read',v.condominium_id) then v.actual_cost_recorded:=null; v.estimated_amount:=null; v.actual_amount:=null; v.approved_amount:=null; v.financial_revision:=null; v.approved_revision:=null; v.selected_quotation_id:=null; end if;
 return v;
end $$;

-- Immutable document versions. Files are uploaded first, then registered atomically.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('maintenance-documents','maintenance-documents',false,10485760,array['application/pdf','image/jpeg','image/png','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']) on conflict(id) do nothing;
create or replace function public.register_maintenance_document(p_condominium_id uuid,p_document uuid,p_version uuid,p_work_order uuid,p_contract uuid,p_equipment uuid,p_quotation uuid,p_title text,p_kind text,p_filename text,p_mime text,p_size bigint) returns uuid
language plpgsql security definer set search_path='' as $$ declare d public.maintenance_documents%rowtype; n integer; object_name text; begin
 perform maintenance_private.require_permission(p_condominium_id,'maintenance.documents.manage');
 if p_document is null then
  insert into public.maintenance_documents(condominium_id,work_order_id,contract_id,equipment_id,quotation_id,title,document_kind) values(p_condominium_id,p_work_order,p_contract,p_equipment,p_quotation,p_title,p_kind) returning * into d;
 else select * into d from public.maintenance_documents where id=p_document and condominium_id=p_condominium_id for update; if d.id is null then raise exception 'Documento inacessível'; end if; end if;
 object_name:=p_condominium_id::text||'/'||p_version::text;
 if not exists(select 1 from storage.objects o where o.bucket_id='maintenance-documents' and o.name=object_name and o.owner_id=auth.uid()::text and (o.metadata->>'size')::bigint=p_size and o.metadata->>'mimetype'=p_mime) then raise exception 'Arquivo ausente ou metadados incompatíveis'; end if;
 select coalesce(max(version),0)+1 into n from public.maintenance_document_versions where document_id=d.id;
 insert into public.maintenance_document_versions(id,condominium_id,document_id,version,object_path,original_filename,mime_type,size_bytes,uploaded_by) values(p_version,p_condominium_id,d.id,n,object_name,p_filename,p_mime,p_size,public.current_user_account_id());
 if d.work_order_id is not null then perform maintenance_private.order_event(d.work_order_id,'document_uploaded',d.title||' · versão '||n); end if;
 return d.id;
end $$;
create or replace function maintenance_private.document_registered(p_path text) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.maintenance_document_versions where object_path=p_path) $$;
create policy maintenance_storage_read on storage.objects for select to authenticated using(bucket_id='maintenance-documents' and (exists(select 1 from public.maintenance_document_versions v where v.object_path=name and public.has_permission('maintenance.documents.read',v.condominium_id)) or (owner_id=auth.uid()::text and not maintenance_private.document_registered(name) and public.has_permission('maintenance.documents.manage',case when split_part(name,'/',1) ~ '^[0-9a-f-]{36}$' then split_part(name,'/',1)::uuid else null end))));
create policy maintenance_storage_insert on storage.objects for insert to authenticated with check(bucket_id='maintenance-documents' and split_part(name,'/',1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and public.has_permission('maintenance.documents.manage',case when split_part(name,'/',1) ~ '^[0-9a-f-]{36}$' then split_part(name,'/',1)::uuid else null end));
-- Only unregistered files owned by the current user may be removed after failed registration.
create policy maintenance_storage_cleanup on storage.objects for delete to authenticated using(bucket_id='maintenance-documents' and owner_id=auth.uid()::text and not maintenance_private.document_registered(name) and public.has_permission('maintenance.documents.manage',case when split_part(name,'/',1) ~ '^[0-9a-f-]{36}$' then split_part(name,'/',1)::uuid else null end));

create or replace function public.save_maintenance_plan(p_condominium_id uuid,p_id uuid,p_structure uuid,p_equipment uuid,p_type uuid,p_provider uuid,p_contract uuid,p_responsible uuid,p_description text,p_interval integer,p_next date,p_advance integer,p_estimated numeric,p_checklist text[],p_status text) returns uuid
language plpgsql security definer set search_path='' as $$ declare result uuid; begin
 perform maintenance_private.require_permission(p_condominium_id,'maintenance.plans.manage');
 if p_equipment is not null and not exists(select 1 from public.maintenance_equipment where id=p_equipment and structure_id=p_structure and condominium_id=p_condominium_id and status='active') then raise exception 'Equipamento incompatível'; end if;
 if p_responsible is not null and not exists(select 1 from public.list_maintenance_work_order_assignees(p_condominium_id) where user_account_id=p_responsible) then raise exception 'Responsável inválido'; end if;
 if p_provider is not null and not exists(select 1 from public.service_providers where id=p_provider and condominium_id=p_condominium_id and status='active') then raise exception 'Prestador inválido'; end if;
 if p_contract is not null and not exists(select 1 from public.maintenance_contracts where id=p_contract and condominium_id=p_condominium_id and service_provider_id=p_provider and status='active') then raise exception 'Contrato incompatível'; end if;
 if cardinality(p_checklist)>100 or exists(select 1 from unnest(p_checklist) item where length(btrim(item)) not between 2 and 500) then raise exception 'Checklist deve ter até 100 itens de 2 a 500 caracteres'; end if;
 if p_id is null then insert into public.maintenance_plans(condominium_id,structure_id,equipment_id,service_type_id,service_provider_id,contract_id,responsible_user_account_id,description,interval_days,next_due_on,advance_days,estimated_amount,checklist_template,status,created_by) values(p_condominium_id,p_structure,p_equipment,p_type,p_provider,p_contract,p_responsible,p_description,p_interval,p_next,p_advance,p_estimated,p_checklist,p_status,public.current_user_account_id()) returning id into result;
 else update public.maintenance_plans set structure_id=p_structure,equipment_id=p_equipment,service_type_id=p_type,service_provider_id=p_provider,contract_id=p_contract,responsible_user_account_id=p_responsible,description=p_description,interval_days=p_interval,next_due_on=p_next,advance_days=p_advance,estimated_amount=p_estimated,checklist_template=p_checklist,status=p_status,updated_at=now() where id=p_id and condominium_id=p_condominium_id returning id into result; end if;
 if result is null then raise exception 'Plano inacessível'; end if; return result;
end $$;
create or replace function maintenance_private.generate_due(p_condo uuid default null) returns integer
language plpgsql security definer set search_path='' as $$ declare p public.maintenance_plans%rowtype; order_id uuid; number bigint; generated integer:=0; creator uuid; begin
 for p in select * from public.maintenance_plans where status='active' and (p_condo is null or condominium_id=p_condo) and next_due_on<=maintenance_private.today(condominium_id)+advance_days order by next_due_on limit 200 for update skip locked loop
  if not exists(select 1 from public.condominium_structures where id=p.structure_id and status='active') or (p.equipment_id is not null and not exists(select 1 from public.maintenance_equipment where id=p.equipment_id and status='active')) then continue; end if;
  creator:=p.created_by;
  if p.responsible_user_account_id is not null and not exists(select 1 from public.user_accounts ua join public.people pe on pe.id=ua.person_id and pe.status='active' where ua.id=p.responsible_user_account_id and ua.status='active' and exists(select 1 from public.role_assignments ra join public.role_permissions rp on rp.role_id=ra.role_id join public.permissions perm on perm.id=rp.permission_id join public.roles r on r.id=ra.role_id and r.status='active' where ra.user_account_id=ua.id and ra.condominium_id=p.condominium_id and ra.status='active' and ra.starts_at<=now() and (ra.ends_at is null or ra.ends_at>now()) and perm.code in ('maintenance.orders.update','maintenance.orders.manage'))) then p.responsible_user_account_id:=null; end if;
  if creator is null then continue; end if;
  perform pg_advisory_xact_lock(hashtextextended(p.condominium_id::text,62003));
  select coalesce(max(work_order_number),0)+1 into number from public.maintenance_work_orders where condominium_id=p.condominium_id;
  insert into public.maintenance_work_orders(condominium_id,work_order_number,structure_id,equipment_id,description,priority,origin,status,responsible_user_account_id,service_provider_id,due_at,scheduled_on,created_by_user_account_id,maintenance_kind,service_type_id,contract_id,estimated_amount,plan_id,plan_due_on)
  values(p.condominium_id,number,p.structure_id,p.equipment_id,p.description,'medium','preventive_plan',case when p.responsible_user_account_id is null then 'open' else 'assigned' end,p.responsible_user_account_id,p.service_provider_id,p.next_due_on,p.next_due_on,creator,'preventive',p.service_type_id,p.contract_id,p.estimated_amount,p.id,p.next_due_on) on conflict(plan_id,plan_due_on) do nothing returning id into order_id;
  if order_id is not null then
   insert into public.maintenance_checklist_items(condominium_id,work_order_id,description) select p.condominium_id,order_id,btrim(item) from unnest(p.checklist_template) item where length(btrim(item))>=2;
   perform maintenance_private.order_event(order_id,'created','Gerada pelo plano preventivo');
   perform public.emit_maintenance_work_order_notification(order_id,'maintenance_work_order_created','Manutenção preventiva programada','Uma OS preventiva foi gerada.');
   generated:=generated+1;
  end if;
  update public.maintenance_plans set next_due_on=next_due_on+interval_days,updated_at=now() where id=p.id;
 end loop;
 return generated;
end $$;
create or replace function public.generate_due_maintenance_orders(p_condominium_id uuid) returns integer language plpgsql security definer set search_path='' as $$ begin
 perform maintenance_private.require_permission(p_condominium_id,'maintenance.plans.manage'); return maintenance_private.generate_due(p_condominium_id);
end $$;

-- Preserve notification check and add only maintenance types.
do $$ declare c text; begin
 select pg_get_constraintdef(oid) into c from pg_constraint where conrelid='public.notifications'::regclass and conname='notifications_notification_type_check';
 execute 'alter table public.notifications drop constraint notifications_notification_type_check';
 c:=replace(c,'''maintenance_work_order_created''','''maintenance_work_order_created'', ''maintenance_financial_approval_requested'', ''maintenance_deadline_alert'', ''maintenance_contract_expiry'', ''maintenance_warranty_expiry''');
 execute 'alter table public.notifications add constraint notifications_notification_type_check '||c;
end $$;
create or replace function maintenance_private.daily() returns void language plpgsql security definer set search_path='' as $$ begin
 perform maintenance_private.generate_due();
 insert into public.notifications(condominium_id,recipient_user_account_id,notification_type,title,message,entity_type,entity_id)
 select w.condominium_id,w.responsible_user_account_id,'maintenance_deadline_alert','Prazo de manutenção','OS #'||w.work_order_number||' · prazo '||w.due_at,'maintenance_work_order',w.id
 from public.maintenance_work_orders w left join public.maintenance_settings s on s.condominium_id=w.condominium_id where w.status not in ('completed','cancelled') and w.responsible_user_account_id is not null and w.due_at<=maintenance_private.today(w.condominium_id)+coalesce(s.alert_advance_days,7) on conflict do nothing;

 insert into public.notifications(condominium_id,recipient_user_account_id,notification_type,title,message,entity_type,entity_id)
 select c.condominium_id,ra.user_account_id,'maintenance_contract_expiry','Contrato próximo do vencimento',c.title||' · término '||c.ends_on,'maintenance_contract',c.id
 from public.maintenance_contracts c join public.role_assignments ra on ra.condominium_id=c.condominium_id and ra.status='active' and ra.starts_at<=now() and (ra.ends_at is null or ra.ends_at>now()) join public.roles r on r.id=ra.role_id and r.code in ('condominium.syndic','condominium.manager') and r.status='active' join public.user_accounts ua on ua.id=ra.user_account_id and ua.status='active'
 left join public.maintenance_settings s on s.condominium_id=c.condominium_id where c.status='active' and c.ends_on<=maintenance_private.today(c.condominium_id)+coalesce(s.alert_advance_days,7) on conflict do nothing;
 insert into public.notifications(condominium_id,recipient_user_account_id,notification_type,title,message,entity_type,entity_id)
 select e.condominium_id,ra.user_account_id,'maintenance_warranty_expiry','Garantia próxima do vencimento',e.identification||' · garantia até '||e.warranty_until,'maintenance_equipment',e.id
 from public.maintenance_equipment e join public.role_assignments ra on ra.condominium_id=e.condominium_id and ra.status='active' and ra.starts_at<=now() and (ra.ends_at is null or ra.ends_at>now()) join public.roles r on r.id=ra.role_id and r.code in ('condominium.syndic','condominium.manager') and r.status='active' join public.user_accounts ua on ua.id=ra.user_account_id and ua.status='active'
 left join public.maintenance_settings s on s.condominium_id=e.condominium_id where e.status='active' and e.warranty_until<=maintenance_private.today(e.condominium_id)+coalesce(s.alert_advance_days,7) on conflict do nothing;
end $$;
-- pg_cron is installed on hosted Supabase; schedule only when available.
do $$ begin if not exists(select 1 from pg_extension where extname='pg_cron') and exists(select 1 from pg_available_extensions where name='pg_cron') then execute 'create extension pg_cron'; end if; if exists(select 1 from pg_extension where extname='pg_cron') then
 perform cron.schedule('condovia-maintenance-daily','0 10 * * *','select maintenance_private.daily()');
end if; end $$;

-- No public execution of private helpers or legacy transition bypass.
revoke all on all functions in schema maintenance_private from public,anon,authenticated;
grant usage on schema maintenance_private to authenticated;
grant execute on function maintenance_private.document_registered(text) to authenticated;
do $$ declare f record; begin for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('save_maintenance_provider','save_maintenance_contract','save_maintenance_service_type','save_maintenance_approval_rule','save_maintenance_document_requirement','update_maintenance_order_details','save_maintenance_quotation','select_maintenance_quotation','request_maintenance_financial_approval','decide_maintenance_financial_approval','save_maintenance_checklist','register_maintenance_document','save_maintenance_plan','generate_due_maintenance_orders','transition_maintenance_work_order') loop
 execute format('revoke all on function %s from public,anon',f.signature); execute format('grant execute on function %s to authenticated',f.signature);
end loop; end $$;
-- Financial columns are not readable through the operational OS API.
revoke select on public.maintenance_work_orders from authenticated;
do $$ declare cols text; begin
 select string_agg(quote_ident(column_name),',') into cols from information_schema.columns where table_schema='public' and table_name='maintenance_work_orders' and column_name not in ('estimated_amount','approved_amount','actual_amount','actual_cost_recorded','financial_revision','approved_revision','selected_quotation_id');
 execute 'grant select ('||cols||') on public.maintenance_work_orders to authenticated';
end $$;
create or replace function public.get_maintenance_order_finances(p_order uuid) returns jsonb language plpgsql security definer set search_path='' as $$ declare v public.maintenance_work_orders%rowtype; begin
 select * into v from public.maintenance_work_orders where id=p_order;
 perform maintenance_private.require_permission(v.condominium_id,'maintenance.finance.read');
 return jsonb_build_object('actual_cost_recorded',v.actual_cost_recorded,'estimated_amount',v.estimated_amount,'actual_amount',v.actual_amount,'approved_amount',v.approved_amount,'financial_revision',v.financial_revision,'approved_revision',v.approved_revision,'selected_quotation_id',v.selected_quotation_id);
end $$;
create or replace function public.list_maintenance_order_finances(p_condominium_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$ declare result jsonb; begin
 perform maintenance_private.require_permission(p_condominium_id,'maintenance.finance.read');
 select coalesce(jsonb_agg(jsonb_build_object('id',w.id,'work_order_number',w.work_order_number,'description',w.description,'status',w.status,'due_at',w.due_at,'estimated_amount',w.estimated_amount,'actual_amount',w.actual_amount,'approved_amount',w.approved_amount,'financial_revision',w.financial_revision,'approved_revision',w.approved_revision) order by w.created_at desc),'[]'::jsonb) into result from public.maintenance_work_orders w where w.condominium_id=p_condominium_id;
 return result;
end $$;
alter function public.update_maintenance_work_order_activity(uuid,text,text,text) rename to update_maintenance_work_order_activity_p83;
revoke all on function public.update_maintenance_work_order_activity_p83(uuid,text,text,text) from public,anon,authenticated;
create or replace function public.update_maintenance_work_order_activity(p_work_order_id uuid,p_activity_notes text,p_observations text,p_technical_conclusion text default null) returns public.maintenance_work_orders language plpgsql security definer set search_path='' as $$ declare v public.maintenance_work_orders%rowtype; begin
 select * into v from public.update_maintenance_work_order_activity_p83(p_work_order_id,p_activity_notes,p_observations,p_technical_conclusion);
 if not public.has_permission('maintenance.finance.read',v.condominium_id) then v.actual_cost_recorded:=null; v.estimated_amount:=null; v.actual_amount:=null; v.approved_amount:=null; v.financial_revision:=null; v.approved_revision:=null; v.selected_quotation_id:=null; end if;
 return v;
end $$;
revoke all on function public.get_maintenance_order_finances(uuid),public.list_maintenance_order_finances(uuid),public.update_maintenance_work_order_activity(uuid,text,text,text) from public,anon;
grant execute on function public.get_maintenance_order_finances(uuid),public.list_maintenance_order_finances(uuid),public.update_maintenance_work_order_activity(uuid,text,text,text) to authenticated;
create policy service_providers_maintenance_read on public.service_providers for select to authenticated using(public.has_permission('maintenance.read',condominium_id));
create or replace function public.list_maintenance_work_order_assignees(p_condominium_id uuid)
returns table(user_account_id uuid, display_name text)
language plpgsql stable security definer set search_path = public as $$
begin
  perform maintenance_private.require_permission(p_condominium_id,'maintenance.orders.read');
  return query
  select ua.id,
    coalesce(nullif(btrim(p.preferred_name), ''), nullif(btrim(p.full_name), ''), ua.id::text)
  from public.user_accounts ua
  join public.people p on p.id = ua.person_id
  where ua.status = 'active'
    and p.status = 'active'
    and exists (
      select 1
      from public.role_assignments ra
      join public.role_permissions rp on rp.role_id = ra.role_id
      join public.permissions perm on perm.id = rp.permission_id
      join public.roles role on role.id = ra.role_id and role.status = 'active'
      where ra.user_account_id = ua.id
        and ra.condominium_id = p_condominium_id
        and ra.status = 'active'
        and ra.starts_at <= now()
        and (ra.ends_at is null or ra.ends_at > now())
        and perm.code in ('maintenance.orders.update', 'maintenance.orders.manage')
    )
  order by 2;
end $$;


create or replace function public.get_maintenance_order_history(p_order uuid) returns table(id uuid,event_type text,previous_status text,new_status text,reason text,created_at timestamptz,actor_name text) language plpgsql stable security definer set search_path='' as $$ declare v public.maintenance_work_orders%rowtype; begin
 select * into v from public.maintenance_work_orders w where w.id=p_order;
 perform maintenance_private.require_permission(v.condominium_id,'maintenance.orders.read');
 return query select h.id,h.event_type,h.previous_status,h.new_status,h.reason,h.created_at,coalesce(nullif(p.preferred_name,''),p.full_name,'Sistema') from public.maintenance_work_order_history h left join public.user_accounts ua on ua.id=h.actor_user_account_id left join public.people p on p.id=ua.person_id where h.work_order_id=p_order order by h.created_at,h.id;
end $$;
revoke all on function public.get_maintenance_order_history(uuid) from public,anon;
grant execute on function public.get_maintenance_order_history(uuid) to authenticated;
create or replace function public.manage_maintenance_order_team(p_order uuid,p_responsible uuid,p_due date,p_participant uuid default null,p_remove boolean default false) returns void language plpgsql security definer set search_path='' as $$ declare v public.maintenance_work_orders%rowtype; begin
 select * into v from public.maintenance_work_orders where id=p_order for update;
 perform maintenance_private.require_permission(v.condominium_id,'maintenance.orders.manage');
 if v.status in ('completed','cancelled') then raise exception 'OS encerrada'; end if;
 if p_responsible is null or not exists(select 1 from public.list_maintenance_work_order_assignees(v.condominium_id) where user_account_id=p_responsible) then raise exception 'Responsável inválido'; end if;
 if p_participant is not null then
  if not exists(select 1 from public.list_maintenance_work_order_assignees(v.condominium_id) where user_account_id=p_participant) then raise exception 'Participante inválido'; end if;
  if p_remove then delete from public.maintenance_work_order_participants where work_order_id=v.id and user_account_id=p_participant;
  else insert into public.maintenance_work_order_participants(work_order_id,condominium_id,user_account_id) values(v.id,v.condominium_id,p_participant) on conflict do nothing; end if;
 end if;
 update public.maintenance_work_orders set responsible_user_account_id=p_responsible,due_at=p_due,status=case when status='open' then 'assigned' else status end where id=v.id;
 perform maintenance_private.order_event(v.id,'details_updated','Responsável, equipe ou prazo atualizado');
end $$;
revoke all on function public.manage_maintenance_order_team(uuid,uuid,date,uuid,boolean) from public,anon;
grant execute on function public.manage_maintenance_order_team(uuid,uuid,date,uuid,boolean) to authenticated;

alter table public.maintenance_work_orders drop constraint maintenance_work_orders_origin_check;
alter table public.maintenance_work_orders add constraint maintenance_work_orders_origin_check check(origin in ('maintenance_request','direct','preventive_plan','occurrence'));

-- Optional commercial fields on creation, keeping the original RPC defaults compatible.
alter function public.create_maintenance_work_order(uuid,uuid,uuid,text,text,uuid,uuid,date) rename to create_maintenance_work_order_p83;
revoke all on function public.create_maintenance_work_order_p83(uuid,uuid,uuid,text,text,uuid,uuid,date) from public,anon,authenticated;
create or replace function public.create_maintenance_work_order(
 p_maintenance_request_id uuid default null,p_structure_id uuid default null,p_equipment_id uuid default null,p_description text default null,p_priority text default null,p_responsible_user_account_id uuid default null,p_service_provider_id uuid default null,p_due_at date default null,
 p_maintenance_kind text default 'corrective',p_service_type_id uuid default null,p_contract_id uuid default null,p_estimated_amount numeric default 0,p_occurrence_id uuid default null
) returns table(id uuid,work_order_number bigint,status text) language plpgsql security definer set search_path='' as $$ declare created record; tenant uuid; begin
 select * into created from public.create_maintenance_work_order_p83(p_maintenance_request_id,p_structure_id,p_equipment_id,p_description,p_priority,p_responsible_user_account_id,p_service_provider_id,p_due_at);
 select w.condominium_id into tenant from public.maintenance_work_orders w where w.id=created.id;
 if p_estimated_amount is null or p_estimated_amount<0 then raise exception 'Orçamento inválido'; end if;
 if p_estimated_amount<>0 or p_service_type_id is not null or p_contract_id is not null or p_maintenance_kind<>'corrective' or p_occurrence_id is not null then
  perform maintenance_private.require_permission(tenant,'maintenance.finance.manage');
  perform public.update_maintenance_order_details(created.id,p_maintenance_kind,p_service_type_id,p_contract_id,p_service_provider_id,p_occurrence_id,p_estimated_amount,0,null);
  update public.maintenance_work_orders w set actual_cost_recorded=false,origin=case when p_occurrence_id is not null then 'occurrence' else w.origin end where w.id=created.id;
 end if;
 id:=created.id;work_order_number:=created.work_order_number;status:=created.status;return next;
end $$;
revoke all on function public.create_maintenance_work_order(uuid,uuid,uuid,text,text,uuid,uuid,date,text,uuid,uuid,numeric,uuid) from public,anon;
grant execute on function public.create_maintenance_work_order(uuid,uuid,uuid,text,text,uuid,uuid,date,text,uuid,uuid,numeric,uuid) to authenticated;

commit;
