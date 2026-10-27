begin;

-- Ledger separado: negações nunca alteram a presença calculada por access_events.
create table public.access_simulations (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id),
  device_id uuid not null references public.access_devices(id),
  external_event_id text not null check (char_length(external_event_id) between 1 and 100),
  authorization_id uuid not null references public.access_authorizations(id),
  event_type text not null check (event_type in ('entry', 'exit', 'denied')),
  occurred_at timestamptz not null,
  outcome text not null check (outcome in ('record', 'record_denied', 'record_inconsistent')),
  out_of_order boolean not null default false,
  access_event_id uuid references public.access_events(id),
  recorded_by_user_account_id uuid not null references public.user_accounts(id),
  created_at timestamptz not null default now(),
  unique (device_id, external_event_id)
);
alter table public.access_simulations enable row level security;
create policy access_simulations_read on public.access_simulations for select to authenticated
  using (public.has_permission('structures.manage', condominium_id));
grant select on public.access_simulations to authenticated;
revoke insert, update, delete on public.access_simulations from anon, authenticated;
create trigger access_simulations_immutable before update or delete on public.access_simulations
  for each row execute function public.prevent_access_event_mutation();

-- A operação é atômica e revalida os dados e as permissões no banco.
create function public.record_access_simulation(
  p_condominium_id uuid, p_device_id uuid, p_authorization_id uuid,
  p_external_event_id text, p_event_type text, p_occurred_at timestamptz
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_device public.access_devices%rowtype;
  v_auth public.access_authorizations%rowtype;
  v_actor uuid := public.current_user_account_id();
  v_event uuid;
  v_existing uuid;
  v_last timestamptz;
  v_outcome text;
  v_out_of_order boolean := false;
  v_notes text;
begin
  -- Defesa também contra chamadas diretas em outro projeto/ambiente.
  if (auth.jwt() ->> 'iss') is distinct from 'https://kgvbmisocqmsxcibpumq.supabase.co/auth/v1' then
    raise exception 'Simulação habilitada somente no banco de homologação';
  end if;
  if auth.uid() is null or v_actor is null or public.has_permission('structures.manage', p_condominium_id) is not true then
    raise exception 'Permissão negada para simular eventos';
  end if;
  if p_event_type is null or p_event_type not in ('entry','exit','denied') or
     p_external_event_id is null or char_length(btrim(p_external_event_id)) not between 1 and 100 or
     p_occurred_at is null or p_occurred_at > now() + interval '5 minutes' or p_occurred_at < now() - interval '7 days' then
    raise exception 'Evento inválido: confira o identificador, tipo e horário (últimos sete dias)';
  end if;
  select * into v_device from public.access_devices
    where id = p_device_id and condominium_id = p_condominium_id and status = 'active' for share;
  if not found then raise exception 'Equipamento inválido ou inativo'; end if;
  perform 1 from public.access_points where id = v_device.access_point_id
    and condominium_id = p_condominium_id and status = 'active' for share;
  if not found then raise exception 'Ponto de acesso inválido ou inativo'; end if;
  select * into v_auth from public.access_authorizations
    where id = p_authorization_id and condominium_id = p_condominium_id for share;
  if not found then raise exception 'Autorização não encontrada neste condomínio'; end if;

  perform pg_advisory_xact_lock(hashtext('device_simulation_' || p_device_id::text));
  select id into v_existing from public.access_simulations
    where device_id = p_device_id and external_event_id = btrim(p_external_event_id);
  if found then return jsonb_build_object('action','duplicate','id',v_existing); end if;
  if exists (select 1 from public.access_events where device_id = p_device_id and external_event_id = btrim(p_external_event_id)) then
    return jsonb_build_object('action','duplicate');
  end if;
  perform pg_advisory_xact_lock(hashtext('gatehouse_person_' || coalesce(v_auth.visitor_id,v_auth.service_provider_id)::text));
  -- Reenvio após registro manual: mesma pessoa, ponto, tipo e janela de 30 segundos.
  if p_event_type <> 'denied' and exists (
    select 1 from public.access_events where condominium_id = p_condominium_id
      and coalesce(visitor_id,service_provider_id) = coalesce(v_auth.visitor_id,v_auth.service_provider_id)
      and access_point_id = v_device.access_point_id and source = 'manual' and event_type = p_event_type
      and occurred_at between p_occurred_at - interval '30 seconds' and p_occurred_at + interval '30 seconds'
  ) then return jsonb_build_object('action','duplicate'); end if;
  select max(occurred_at) into v_last from public.access_simulations where device_id = p_device_id;
  v_out_of_order := v_last is not null and p_occurred_at < v_last;
  v_outcome := case when p_event_type = 'denied' then 'record_denied'
    when v_auth.status <> 'approved' or p_occurred_at < v_auth.valid_from or p_occurred_at > v_auth.valid_until
      then 'record_inconsistent' else 'record' end;
  v_notes := 'SIMULAÇÃO — sem comunicação com equipamento real';
  if v_outcome = 'record_inconsistent' then v_notes := v_notes || '. Autorização vencida ou não aprovada'; end if;
  if v_out_of_order then v_notes := v_notes || '. Evento fora de ordem'; end if;
  if p_event_type <> 'denied' then
    insert into public.access_events (
      condominium_id, access_point_id, visitor_id, service_provider_id, authorization_id, unit_id,
      event_type, occurred_at, recorded_by_user_account_id, notes, source, device_id, external_event_id,
      decision, recognition_method
    ) values (
      p_condominium_id,v_device.access_point_id,v_auth.visitor_id,v_auth.service_provider_id,v_auth.id,v_auth.unit_id,
      p_event_type,p_occurred_at,v_actor,v_notes,'device',p_device_id,btrim(p_external_event_id),'granted','other'
    ) returning id into v_event;
  end if;
  insert into public.access_simulations (
    condominium_id,device_id,external_event_id,authorization_id,event_type,occurred_at,outcome,out_of_order,
    access_event_id,recorded_by_user_account_id
  ) values (p_condominium_id,p_device_id,btrim(p_external_event_id),p_authorization_id,p_event_type,
    p_occurred_at,v_outcome,v_out_of_order,v_event,v_actor) returning id into v_existing;
  insert into public.audit_events (actor_auth_user_id,actor_user_account_id,event_type,entity_type,entity_id,metadata)
    values (auth.uid(),v_actor,'gatehouse.simulation','access_authorization',v_auth.id,
      jsonb_build_object('condominium_id',p_condominium_id,'simulation_id',v_existing,'access_event_id',v_event,'outcome',v_outcome));
  return jsonb_build_object('action',v_outcome,'id',v_existing,'outOfOrder',v_out_of_order);
end;
$$;
revoke all on function public.record_access_simulation(uuid,uuid,uuid,text,text,timestamptz) from public, anon;
grant execute on function public.record_access_simulation(uuid,uuid,uuid,text,text,timestamptz) to authenticated;
create function public.create_access_simulation_device(p_condominium_id uuid, p_access_point_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if (auth.jwt() ->> 'iss') is distinct from 'https://kgvbmisocqmsxcibpumq.supabase.co/auth/v1' or
     auth.uid() is null or public.current_user_account_id() is null or
     public.has_permission('structures.manage', p_condominium_id) is not true then
    raise exception 'Simulação restrita ao gestor da homologação';
  end if;
  perform 1 from public.access_points where id = p_access_point_id and condominium_id = p_condominium_id and status = 'active' for share;
  if not found then raise exception 'Ponto de acesso inválido ou inativo'; end if;
  perform pg_advisory_xact_lock(hashtext('simulation_device_' || p_access_point_id::text));
  select id into v_id from public.access_devices where condominium_id = p_condominium_id and access_point_id = p_access_point_id
    and manufacturer = 'CondoVia' and model = 'Simulador interno' and status = 'active' limit 1;
  if found then return v_id; end if;
  insert into public.access_devices (condominium_id,access_point_id,manufacturer,model)
    values (p_condominium_id,p_access_point_id,'CondoVia','Simulador interno') returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.create_access_simulation_device(uuid,uuid) from public, anon;
grant execute on function public.create_access_simulation_device(uuid,uuid) to authenticated;
commit;
