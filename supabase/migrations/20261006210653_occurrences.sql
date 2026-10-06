-- P6: ocorrências locais, isoladas por condomínio e integradas a notifications.
begin;

create table public.occurrence_categories (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  name text not null check (length(btrim(name)) >= 2),
  description text,
  default_priority text not null default 'normal' check (default_priority in ('low','normal','high','urgent')),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (condominium_id, name),
  unique (id, condominium_id)
);

create table public.occurrences (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  occurrence_number bigint not null,
  category_id uuid not null references public.occurrence_categories(id) on delete restrict,
  title text not null check (length(btrim(title)) between 3 and 180),
  description text not null check (length(btrim(description)) between 3 and 10000),
  priority text not null check (priority in ('low','normal','high','urgent')),
  status text not null default 'open' check (status in ('open','triage','in_progress','resolved','closed','cancelled')),
  origin text not null default 'resident' check (origin in ('resident','gatehouse','admin')),
  requester_person_id uuid not null references public.people(id) on delete restrict,
  related_unit_id uuid references public.units(id) on delete restrict,
  assignee_user_account_id uuid references public.user_accounts(id) on delete set null,
  confidential boolean not null default false,
  resolution text,
  resolved_at timestamptz,
  resolved_by_user_account_id uuid references public.user_accounts(id) on delete set null,
  closed_at timestamptz,
  closed_by_user_account_id uuid references public.user_accounts(id) on delete set null,
  cancelled_at timestamptz,
  cancelled_by_user_account_id uuid references public.user_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (condominium_id, occurrence_number),
  unique (id, condominium_id),
  check ((status in ('resolved','closed')) = (resolved_at is not null)),
  check ((status = 'closed') = (closed_at is not null)),
  check ((status = 'cancelled') = (cancelled_at is not null)),
  foreign key (category_id, condominium_id) references public.occurrence_categories(id, condominium_id),
  foreign key (related_unit_id, condominium_id) references public.units(id, condominium_id)
);

create table public.occurrence_history (
  id uuid primary key default gen_random_uuid(),
  occurrence_id uuid not null references public.occurrences(id) on delete restrict,
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  event_type text not null check (event_type in ('created','triaged','priority_changed','assigned','reassigned','status_changed','resolved','closed','cancelled','reopened')),
  previous_status text,
  new_status text,
  reason text,
  actor_user_account_id uuid references public.user_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (occurrence_id, condominium_id) references public.occurrences(id, condominium_id)
);

create table public.occurrence_comments (
  id uuid primary key default gen_random_uuid(),
  occurrence_id uuid not null references public.occurrences(id) on delete restrict,
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  author_user_account_id uuid not null references public.user_accounts(id) on delete restrict,
  visibility text not null check (visibility in ('requester','internal')),
  body text not null check (length(btrim(body)) between 1 and 10000),
  created_at timestamptz not null default now(),
  foreign key (occurrence_id, condominium_id) references public.occurrences(id, condominium_id)
);

create index occurrences_scope_idx on public.occurrences(condominium_id, status, created_at desc);
create index occurrences_requester_idx on public.occurrences(requester_person_id, created_at desc);
create index occurrence_history_idx on public.occurrence_history(occurrence_id, created_at);
create index occurrence_comments_idx on public.occurrence_comments(occurrence_id, created_at);

insert into public.occurrence_categories(condominium_id, name, default_priority, sort_order)
select c.id, defaults.name, defaults.default_priority, defaults.sort_order
from public.condominiums c
cross join (values
 ('Barulho/Perturbação','normal',10),('Segurança','high',20),('Áreas comuns','normal',30),
 ('Garagem/Veículos','normal',40),('Animais','normal',50),('Limpeza','normal',60),
 ('Infraestrutura','high',70),('Regras/Regimento','normal',80),('Outros','normal',90)
) as defaults(name, default_priority, sort_order)
where not exists (select 1 from public.occurrence_categories existing where existing.condominium_id=c.id and existing.name=defaults.name);

insert into public.permissions(code, description, scope) values
 ('occurrences.read','Consultar ocorrências','condominium'),('occurrences.create','Criar ocorrências','condominium'),
 ('occurrences.update','Atualizar ocorrências','condominium'),('occurrences.triage','Fazer triagem de ocorrências','condominium'),
 ('occurrences.assign','Atribuir ocorrências','condominium'),('occurrences.resolve','Resolver ocorrências','condominium'),
 ('occurrences.close','Encerrar ocorrências','condominium'),('occurrences.reopen','Reabrir ocorrências','condominium'),
 ('occurrences.manage_categories','Administrar categorias de ocorrências','condominium')
on conflict (code) do nothing;

insert into public.role_permissions(role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code in ('condominium.syndic','condominium.manager') and p.code like 'occurrences.%'
on conflict do nothing;
insert into public.role_permissions(role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code = 'condominium.resident' and p.code in ('occurrences.create')
on conflict do nothing;
insert into public.role_permissions(role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code = 'condominium.doorman' and p.code in ('occurrences.create')
on conflict do nothing;

alter table public.notifications drop constraint if exists notifications_notification_type_check;
alter table public.notifications add constraint notifications_notification_type_check check (notification_type in (
  'reservation_requested','reservation_approved','reservation_rejected','reservation_cancelled',
  'occurrence_created','occurrence_assigned','occurrence_commented','occurrence_status_changed',
  'occurrence_resolved','occurrence_reopened','occurrence_closed','occurrence_cancelled'
));

alter table public.occurrence_categories enable row level security;
alter table public.occurrences enable row level security;
alter table public.occurrence_history enable row level security;
alter table public.occurrence_comments enable row level security;

grant select on public.occurrence_categories, public.occurrences, public.occurrence_history, public.occurrence_comments to authenticated;
grant insert, update on public.occurrences to authenticated;
grant insert on public.occurrence_comments to authenticated;

create policy occurrence_categories_read on public.occurrence_categories for select to authenticated using (public.has_permission('occurrences.read', condominium_id) or public.has_permission('occurrences.create', condominium_id));
create policy occurrence_categories_manage on public.occurrence_categories for all to authenticated using (public.has_permission('occurrences.manage_categories', condominium_id)) with check (public.has_permission('occurrences.manage_categories', condominium_id));
create policy occurrences_read on public.occurrences for select to authenticated using (
  public.has_permission('occurrences.read', condominium_id)
  or requester_person_id = public.current_person_id()
);
create policy occurrences_insert on public.occurrences for insert to authenticated with check (
  public.has_permission('occurrences.create', condominium_id)
  and requester_person_id = public.current_person_id()
);
create policy occurrences_update on public.occurrences for update to authenticated using (public.has_permission('occurrences.update', condominium_id)) with check (public.has_permission('occurrences.update', condominium_id));
create policy occurrence_history_read on public.occurrence_history for select to authenticated using (exists (select 1 from public.occurrences o where o.id = occurrence_id and (public.has_permission('occurrences.read', o.condominium_id) or o.requester_person_id = public.current_person_id())));
create policy occurrence_comments_read on public.occurrence_comments for select to authenticated using (exists (select 1 from public.occurrences o where o.id = occurrence_id and (author_user_account_id = public.current_user_account_id() or public.has_permission('occurrences.read', o.condominium_id)) and (visibility = 'requester' or public.has_permission('occurrences.update', o.condominium_id) or public.has_permission('occurrences.triage', o.condominium_id) or public.has_permission('occurrences.assign', o.condominium_id) or public.has_permission('occurrences.resolve', o.condominium_id))));
create policy occurrence_comments_insert on public.occurrence_comments for insert to authenticated with check (author_user_account_id = public.current_user_account_id());

create or replace function public.occurrence_actor_can_manage(p_condominium_id uuid, p_permission text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_permission(p_permission, p_condominium_id);
$$;

create or replace function public.create_occurrence(p_category_id uuid, p_title text, p_description text, p_priority text default null, p_related_unit_id uuid default null, p_confidential boolean default false, p_origin text default 'resident')
returns table(id uuid, occurrence_number bigint, status text)
language plpgsql security definer set search_path = public as $$
declare v_account uuid := public.current_user_account_id(); v_person uuid := public.current_person_id(); v_condo uuid; v_category public.occurrence_categories%rowtype; v_priority text; v_number bigint;
begin
 if v_account is null or v_person is null then raise exception 'Acesso não autenticado' using errcode='42501'; end if;
 select condominium_id, name, description, default_priority into v_category from public.occurrence_categories where id=p_category_id and is_active;
 if v_category.id is null then raise exception 'Categoria inacessível' using errcode='42501'; end if;
 v_condo := v_category.condominium_id;
 if not (public.has_permission('occurrences.create', v_condo) and (public.has_permission('occurrences.read', v_condo) or p_origin <> 'admin')) then raise exception 'Permissão negada' using errcode='42501'; end if;
 if p_origin not in ('resident','gatehouse','admin') then raise exception 'Origem inválida' using errcode='23514'; end if;
 if p_priority is not null and p_priority not in ('low','normal','high','urgent') then raise exception 'Prioridade inválida' using errcode='23514'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_condo::text, 62001));
 select coalesce(max(o.occurrence_number),0)+1 into v_number from public.occurrences o where o.condominium_id=v_condo;
 insert into public.occurrences(condominium_id,occurrence_number,category_id,title,description,priority,origin,requester_person_id,related_unit_id,confidential)
 values(v_condo,v_number,p_category_id,p_title,p_description,coalesce(p_priority,v_category.default_priority),p_origin,v_person,p_related_unit_id,p_confidential)
 returning occurrences.id, occurrences.occurrence_number, occurrences.status into id, occurrence_number, status;
 insert into public.occurrence_history(occurrence_id,condominium_id,event_type,new_status,actor_user_account_id) values(id,v_condo,'created','open',v_account);
 return next;
end; $$;

create or replace function public.transition_occurrence(p_occurrence_id uuid, p_action text, p_reason text default null, p_assignee_user_account_id uuid default null)
returns public.occurrences language plpgsql security definer set search_path = public as $$
declare v public.occurrences%rowtype; v_account uuid:=public.current_user_account_id(); v_permission text; v_new text; v_event text; v_previous text; v_now timestamptz:=now();
begin
 select * into v from public.occurrences where id=p_occurrence_id for update;
 if v.id is null then raise exception 'Ocorrência inacessível' using errcode='42501'; end if;
 v_previous := v.status;
 v_permission := case p_action when 'triage' then 'occurrences.triage' when 'assign' then 'occurrences.assign' when 'resolve' then 'occurrences.resolve' when 'close' then 'occurrences.close' when 'reopen' then 'occurrences.reopen' when 'cancel' then 'occurrences.update' else 'occurrences.update' end;
 if not public.has_permission(v_permission,v.condominium_id) then raise exception 'Permissão negada' using errcode='42501'; end if;
 if p_action='assign' and not exists (
   select 1 from public.user_accounts ua
   join public.role_assignments ra on ra.user_account_id=ua.id and ra.condominium_id=v.condominium_id and ra.status='active'
   join public.role_permissions arp on arp.role_id=ra.role_id
   join public.permissions ap on ap.id=arp.permission_id and ap.code='occurrences.assign'
   where ua.id=p_assignee_user_account_id and ua.status='active'
 ) then raise exception 'Responsável inválido para este condomínio' using errcode='42501'; end if;
 if p_action='triage' and v.status='open' then v_new:='triage'; v_event:='triaged';
 elsif p_action='assign' and v.status in ('triage','in_progress') then v_new:='in_progress'; v_event:=case when v.assignee_user_account_id is null then 'assigned' else 'reassigned' end;
 elsif p_action='resolve' and v.status='in_progress' then v_new:='resolved'; v_event:='resolved';
 elsif p_action='close' and v.status='resolved' then v_new:='closed'; v_event:='closed';
 elsif p_action='reopen' and v.status='resolved' then v_new:='in_progress'; v_event:='reopened';
 elsif p_action='cancel' and v.status in ('open','triage','in_progress') then v_new:='cancelled'; v_event:='cancelled';
 else raise exception 'Transição inválida' using errcode='23514'; end if;
 update public.occurrences set status=v_new, assignee_user_account_id=case when p_action='assign' then p_assignee_user_account_id else assignee_user_account_id end, resolution=case when p_action='resolve' then p_reason else resolution end, resolved_at=case when v_new='resolved' then v_now else resolved_at end, resolved_by_user_account_id=case when v_new='resolved' then v_account else resolved_by_user_account_id end, closed_at=case when v_new='closed' then v_now else closed_at end, closed_by_user_account_id=case when v_new='closed' then v_account else closed_by_user_account_id end, cancelled_at=case when v_new='cancelled' then v_now else cancelled_at end, cancelled_by_user_account_id=case when v_new='cancelled' then v_account else cancelled_by_user_account_id end, updated_at=v_now where id=v.id returning * into v;
 insert into public.occurrence_history(occurrence_id,condominium_id,event_type,previous_status,new_status,reason,actor_user_account_id) values(v.id,v.condominium_id,v_event,v_previous,v.status,p_reason,v_account);
 if p_action='assign' then perform public.emit_occurrence_notification(v.id,'occurrence_assigned','Ocorrência atribuída','Uma ocorrência foi atribuída a você.',v.assignee_user_account_id);
 elsif p_action='resolve' then perform public.emit_occurrence_notification(v.id,'occurrence_resolved','Ocorrência resolvida','Sua ocorrência foi marcada como resolvida.');
 elsif p_action='reopen' then perform public.emit_occurrence_notification(v.id,'occurrence_reopened','Ocorrência reaberta','Uma ocorrência foi reaberta e voltou para atendimento.');
 elsif p_action='close' then perform public.emit_occurrence_notification(v.id,'occurrence_closed','Ocorrência encerrada','Sua ocorrência foi encerrada.');
 elsif p_action='cancel' then perform public.emit_occurrence_notification(v.id,'occurrence_cancelled','Ocorrência cancelada','Sua ocorrência foi cancelada.');
 end if;
 return v;
end; $$;

create or replace function public.add_occurrence_comment(p_occurrence_id uuid, p_body text, p_visibility text default 'requester')
returns public.occurrence_comments language plpgsql security definer set search_path = public as $$
declare v public.occurrences%rowtype; a uuid:=public.current_user_account_id(); p uuid:=public.current_person_id(); result public.occurrence_comments%rowtype;
begin
 select * into v from public.occurrences where id=p_occurrence_id;
 if v.id is null or not (v.requester_person_id=p or public.has_permission('occurrences.update',v.condominium_id) or public.has_permission('occurrences.triage',v.condominium_id) or public.has_permission('occurrences.assign',v.condominium_id) or public.has_permission('occurrences.resolve',v.condominium_id)) then raise exception 'Ocorrência inacessível' using errcode='42501'; end if;
 if p_visibility='internal' and not (public.has_permission('occurrences.update',v.condominium_id) or public.has_permission('occurrences.triage',v.condominium_id) or public.has_permission('occurrences.assign',v.condominium_id) or public.has_permission('occurrences.resolve',v.condominium_id)) then raise exception 'Permissão negada' using errcode='42501'; end if;
 insert into public.occurrence_comments(occurrence_id,condominium_id,author_user_account_id,visibility,body) values(v.id,v.condominium_id,a,p_visibility,p_body) returning * into result;
 if p_visibility='internal' then perform public.emit_occurrence_notification(v.id,'occurrence_commented','Novo comentário interno','Um administrador adicionou um comentário à ocorrência.');
 else perform public.emit_occurrence_notification(v.id,'occurrence_commented','Novo comentário','Um novo comentário foi adicionado à sua ocorrência.'); end if;
 return result;
end; $$;

revoke all on function public.occurrence_actor_can_manage(uuid,text) from public, anon;
revoke all on function public.create_occurrence(uuid,text,text,text,uuid,boolean,text) from public, anon;
revoke all on function public.transition_occurrence(uuid,text,text,uuid) from public, anon;
revoke all on function public.add_occurrence_comment(uuid,text,text) from public, anon;
grant execute on function public.occurrence_actor_can_manage(uuid,text) to authenticated;
grant execute on function public.create_occurrence(uuid,text,text,text,uuid,boolean,text) to authenticated;
grant execute on function public.transition_occurrence(uuid,text,text,uuid) to authenticated;
grant execute on function public.add_occurrence_comment(uuid,text,text) to authenticated;

-- Eventos de ocorrência reutilizam a mesma tabela/polling de notifications do P5.
create or replace function public.emit_occurrence_notification(
  p_occurrence_id uuid,
  p_notification_type text,
  p_title text,
  p_message text,
  p_recipient_user_account_id uuid default null
)
returns void language plpgsql security definer set search_path = public as $$
declare v public.occurrences%rowtype; v_requester uuid;
begin
  select * into v from public.occurrences where id = p_occurrence_id;
  if v.id is null then return; end if;
  select ua.id into v_requester from public.user_accounts ua where ua.person_id = v.requester_person_id and ua.status = 'active' limit 1;
  if p_recipient_user_account_id is not null then
    insert into public.notifications(condominium_id,recipient_user_account_id,notification_type,title,message,entity_type,entity_id)
    values(v.condominium_id,p_recipient_user_account_id,p_notification_type,p_title,p_message,'occurrence',v.id)
    on conflict do nothing;
  else
    insert into public.notifications(condominium_id,recipient_user_account_id,notification_type,title,message,entity_type,entity_id)
    values(v.condominium_id,v_requester,p_notification_type,p_title,p_message,'occurrence',v.id)
    on conflict do nothing;
    insert into public.notifications(condominium_id,recipient_user_account_id,notification_type,title,message,entity_type,entity_id)
    select v.condominium_id, ua.id, p_notification_type, p_title, p_message, 'occurrence', v.id
    from public.user_accounts ua
    join public.role_assignments ra on ra.user_account_id=ua.id and ra.condominium_id=v.condominium_id and ra.status='active'
    join public.roles r on r.id=ra.role_id and r.code in ('condominium.syndic','condominium.manager') and r.status='active'
    where ua.status='active' and ua.id is distinct from v_requester
    on conflict do nothing;
  end if;
end; $$;

revoke all on function public.emit_occurrence_notification(uuid,text,text,text,uuid) from public, anon, authenticated;

-- Reaplica os RPCs com emissão idempotente de notificações após a escrita transacional.
create or replace function public.create_occurrence(p_category_id uuid, p_title text, p_description text, p_priority text default null, p_related_unit_id uuid default null, p_confidential boolean default false, p_origin text default 'resident')
returns table(id uuid, occurrence_number bigint, status text) language plpgsql security definer set search_path = public as $$
declare v_account uuid:=public.current_user_account_id(); v_person uuid:=public.current_person_id(); v_condo uuid; v_category public.occurrence_categories%rowtype; v_priority text; v_number bigint; v_origin text;
begin
 if v_account is null or v_person is null then raise exception 'Acesso não autenticado' using errcode='42501'; end if;
 select oc.* into v_category from public.occurrence_categories oc where oc.id=p_category_id and oc.is_active;
 if v_category.id is null then raise exception 'Categoria inacessível' using errcode='42501'; end if;
 v_condo:=v_category.condominium_id;
 if not public.has_permission('occurrences.create',v_condo) then raise exception 'Permissão negada' using errcode='42501'; end if;
 if p_priority is not null and p_priority not in ('low','normal','high','urgent') then raise exception 'Prioridade inválida' using errcode='23514'; end if;
 v_origin:=case when exists (select 1 from public.role_assignments ra join public.roles rr on rr.id=ra.role_id where ra.user_account_id=v_account and ra.condominium_id=v_condo and ra.status='active' and rr.code='condominium.doorman' and rr.status='active') then 'gatehouse' else coalesce(nullif(p_origin,''),'resident') end;
 if v_origin not in ('resident','gatehouse','admin') then raise exception 'Origem inválida' using errcode='23514'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_condo::text,62001));
 select coalesce(max(o.occurrence_number),0)+1 into v_number from public.occurrences o where o.condominium_id=v_condo;
 insert into public.occurrences(condominium_id,occurrence_number,category_id,title,description,priority,origin,requester_person_id,related_unit_id,confidential)
 values(v_condo,v_number,p_category_id,p_title,p_description,coalesce(p_priority,v_category.default_priority),v_origin,v_person,p_related_unit_id,p_confidential)
 returning occurrences.id,occurrences.occurrence_number,occurrences.status into id,occurrence_number,status;
 insert into public.occurrence_history(occurrence_id,condominium_id,event_type,new_status,actor_user_account_id) values(id,v_condo,'created','open',v_account);
 perform public.emit_occurrence_notification(id,'occurrence_created','Nova ocorrência','Uma nova ocorrência foi registrada.');
 return next;
end; $$;
grant execute on function public.emit_occurrence_notification(uuid,text,text,text,uuid) to authenticated;

commit;
