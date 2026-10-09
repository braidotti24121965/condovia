-- P8.1 corrective migration: do not access OLD during maintenance_settings INSERT.
create or replace function public.audit_maintenance_foundation_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  entity_name text;
  entity_id uuid;
  condo_id uuid;
  safe jsonb;
begin
  entity_name := case tg_table_name
    when 'maintenance_equipment' then 'maintenance_equipment'
    when 'maintenance_equipment_categories' then 'maintenance_equipment_category'
    else 'maintenance_settings'
  end;

  if tg_op = 'DELETE' then
    entity_id := old.id;
    condo_id := old.condominium_id;
  elsif tg_table_name = 'maintenance_settings' then
    entity_id := new.condominium_id;
    condo_id := new.condominium_id;
  else
    entity_id := new.id;
    condo_id := new.condominium_id;
  end if;

  safe := jsonb_build_object('operation', tg_op, 'condominium_id', condo_id);
  if tg_op = 'UPDATE' then
    safe := safe || jsonb_build_object(
      'old_status', to_jsonb(old)->>'status',
      'new_status', to_jsonb(new)->>'status'
    );
  end if;

  insert into public.audit_events(
    actor_auth_user_id,
    actor_user_account_id,
    event_type,
    entity_type,
    entity_id,
    metadata
  )
  values (
    auth.uid(),
    public.current_user_account_id(),
    'maintenance.' || lower(tg_op),
    entity_name,
    entity_id,
    safe
  );

  return coalesce(new, old);
end $$;
