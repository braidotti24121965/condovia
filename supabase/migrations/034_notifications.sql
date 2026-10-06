-- P5.5.4.1: notificações internas genéricas e eventos de reservas.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  recipient_user_account_id uuid not null references public.user_accounts(id) on delete cascade,
  notification_type text not null check (notification_type in ('reservation_requested','reservation_approved','reservation_rejected','reservation_cancelled')),
  title text not null check (length(btrim(title)) > 0),
  message text not null check (length(btrim(message)) > 0),
  entity_type text not null,
  entity_id uuid not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (condominium_id, recipient_user_account_id, notification_type, entity_type, entity_id)
);

create index notifications_recipient_created_idx on public.notifications(recipient_user_account_id, created_at desc);

alter table public.notifications enable row level security;
revoke all on public.notifications from public, anon, authenticated;
grant select, update on public.notifications to authenticated;

create policy notifications_read_own on public.notifications
  for select to authenticated
  using (recipient_user_account_id = public.current_user_account_id() and public.has_condominium_access(condominium_id));

create policy notifications_mark_own on public.notifications
  for update to authenticated
  using (recipient_user_account_id = public.current_user_account_id() and public.has_condominium_access(condominium_id))
  with check (recipient_user_account_id = public.current_user_account_id() and public.has_condominium_access(condominium_id));

create or replace function public.prevent_notification_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id is distinct from old.id
    or new.condominium_id is distinct from old.condominium_id
    or new.recipient_user_account_id is distinct from old.recipient_user_account_id
    or new.notification_type is distinct from old.notification_type
    or new.title is distinct from old.title
    or new.message is distinct from old.message
    or new.entity_type is distinct from old.entity_type
    or new.entity_id is distinct from old.entity_id
    or new.created_at is distinct from old.created_at then
    raise exception 'Notification identity and content are immutable' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger notifications_immutable_fields
before update on public.notifications
for each row execute function public.prevent_notification_mutation();

create or replace function public.emit_reservation_notification(
  p_condominium_id uuid,
  p_recipient_user_account_id uuid,
  p_notification_type text,
  p_title text,
  p_message text,
  p_entity_id uuid
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notifications
    (condominium_id, recipient_user_account_id, notification_type, title, message, entity_type, entity_id)
  values
    (p_condominium_id, p_recipient_user_account_id, p_notification_type, p_title, p_message, 'reservation', p_entity_id)
  on conflict (condominium_id, recipient_user_account_id, notification_type, entity_type, entity_id) do nothing;
$$;

create or replace function public.emit_reservation_requested_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare resource_name text;
begin
  select name into resource_name from public.reservable_resources where id = new.resource_id and condominium_id = new.condominium_id;
  if exists (select 1 from public.reservable_resources where id = new.resource_id and condominium_id = new.condominium_id and requires_approval) then
    perform public.emit_reservation_notification(new.condominium_id, ua.id, 'reservation_requested', 'Nova solicitação de reserva', 'Nova solicitação de reserva para ' || coalesce(resource_name, 'um recurso') || '.', new.id)
    from public.user_accounts ua
    join public.role_assignments ra on ra.user_account_id = ua.id
    join public.role_permissions rp on rp.role_id = ra.role_id
    join public.permissions p on p.id = rp.permission_id and p.code = 'reservations.manage'
    join public.roles r on r.id = ra.role_id and r.status = 'active'
    where ua.status = 'active' and ra.condominium_id = new.condominium_id and ra.status = 'active'
      and ra.starts_at <= now() and (ra.ends_at is null or ra.ends_at > now())
      and not exists (select 1 from public.permission_overrides po join public.permissions p2 on p2.id = po.permission_id where po.user_account_id = ua.id and po.condominium_id = new.condominium_id and p2.code = 'reservations.manage' and po.effect = 'deny' and po.starts_at <= now() and (po.ends_at is null or po.ends_at > now()));
  end if;
  return new;
end;
$$;

create trigger reservations_requested_notification
after insert on public.reservations
for each row execute function public.emit_reservation_requested_notification();

create or replace function public.emit_reservation_status_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare resource_name text; requester_account uuid; admin_account uuid;
begin
  select r.name into resource_name from public.reservations res join public.reservable_resources r on r.id = res.resource_id and r.condominium_id = res.condominium_id where res.id = new.reservation_id;
  select ua.id into requester_account from public.user_accounts ua join public.reservations res on res.requester_person_id = ua.person_id where res.id = new.reservation_id and ua.status = 'active';
  if new.new_status in ('approved', 'rejected') then
    if requester_account is not null then
      perform public.emit_reservation_notification(new.condominium_id, requester_account, 'reservation_' || new.new_status, 'Reserva ' || case when new.new_status = 'approved' then 'aprovada' else 'rejeitada' end, 'Sua reserva do ' || coalesce(resource_name, 'recurso') || ' foi ' || case when new.new_status = 'approved' then 'aprovada.' else 'rejeitada.' end, new.reservation_id);
    end if;
  elsif new.new_status = 'cancelled' then
    if requester_account is not null and requester_account is distinct from new.changed_by_user_account_id then
      perform public.emit_reservation_notification(new.condominium_id, requester_account, 'reservation_cancelled', 'Reserva cancelada', 'Sua reserva do ' || coalesce(resource_name, 'recurso') || ' foi cancelada.', new.reservation_id);
    else
      for admin_account in
        select ua.id from public.user_accounts ua join public.role_assignments ra on ra.user_account_id = ua.id join public.role_permissions rp on rp.role_id = ra.role_id join public.permissions p on p.id = rp.permission_id and p.code = 'reservations.manage' join public.roles r on r.id = ra.role_id and r.status = 'active' where ua.status = 'active' and ua.id is distinct from new.changed_by_user_account_id and ra.condominium_id = new.condominium_id and ra.status = 'active' and ra.starts_at <= now() and (ra.ends_at is null or ra.ends_at > now()) and not exists (select 1 from public.permission_overrides po join public.permissions p2 on p2.id = po.permission_id where po.user_account_id = ua.id and po.condominium_id = new.condominium_id and p2.code = 'reservations.manage' and po.effect = 'deny' and po.starts_at <= now() and (po.ends_at is null or po.ends_at > now()))
      loop
        perform public.emit_reservation_notification(new.condominium_id, admin_account, 'reservation_cancelled', 'Reserva cancelada', 'Uma reserva do ' || coalesce(resource_name, 'recurso') || ' foi cancelada.', new.reservation_id);
      end loop;
    end if;
  end if;
  return new;
end;
$$;

create trigger reservation_status_notification
after insert on public.reservation_status_history
for each row when (new.new_status in ('approved','rejected','cancelled'))
execute function public.emit_reservation_status_notification();

revoke all on function public.prevent_notification_mutation() from public, anon, authenticated;
revoke all on function public.emit_reservation_notification(uuid,uuid,text,text,text,uuid) from public, anon, authenticated;
revoke all on function public.emit_reservation_requested_notification() from public, anon, authenticated;
revoke all on function public.emit_reservation_status_notification() from public, anon, authenticated;
