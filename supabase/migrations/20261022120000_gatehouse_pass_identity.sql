-- 20261022120000_gatehouse_pass_identity.sql
-- Identity shown to the gatehouse operator when a pass is read: photo path, name, masked document
-- and the plates of the person's active vehicles. Only operators with gatehouse.operate get data.

create or replace function public.get_pass_identity(p_authorization_id uuid)
returns table (
  person_name text,
  person_type text,
  photo_path text,
  document_type text,
  document_masked text,
  plates text[]
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_condominium_id uuid;
  v_visitor_id uuid;
  v_provider_id uuid;
  v_name text;
  v_type text;
  v_photo text;
  v_doc_type text;
  v_doc text;
begin
  select a.condominium_id, a.visitor_id, a.service_provider_id
    into v_condominium_id, v_visitor_id, v_provider_id
  from public.access_authorizations a
  where a.id = p_authorization_id;

  if v_condominium_id is null or not public.has_permission('gatehouse.operate', v_condominium_id) then
    return;
  end if;

  if v_visitor_id is not null then
    select v.full_name, 'Visitante', v.photo_path, v.document_type, v.document_number
      into v_name, v_type, v_photo, v_doc_type, v_doc
    from public.visitors v
    where v.id = v_visitor_id;
  else
    select sp.full_name, 'Prestador de Serviço', sp.photo_path, sp.document_type, sp.document_number
      into v_name, v_type, v_photo, v_doc_type, v_doc
    from public.service_providers sp
    where sp.id = v_provider_id;
  end if;

  return query
  select
    v_name,
    v_type,
    v_photo,
    v_doc_type,
    case
      when v_doc is null then null
      when char_length(v_doc) > 4 then repeat('*', char_length(v_doc) - 4) || right(v_doc, 4)
      else v_doc
    end,
    coalesce(
      (select array_agg(pv.plate order by pv.plate)
         from public.person_vehicles pv
        where pv.status = 'active'
          and (pv.visitor_id = v_visitor_id or pv.service_provider_id = v_provider_id)),
      '{}'::text[]
    );
end;
$$;

-- Operators can read the photo (through a signed URL) of people in their condominium.
drop policy if exists "gatehouse_photos_read" on storage.objects;
create policy "gatehouse_photos_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'gatehouse-photos'
    and (
      public.has_permission('visitors.read', public.gatehouse_photo_condominium_id(name))
      or public.has_permission('providers.read', public.gatehouse_photo_condominium_id(name))
      or public.has_permission('gatehouse.operate', public.gatehouse_photo_condominium_id(name))
    )
  );
