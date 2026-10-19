begin;

create index if not exists person_documents_cpf_normalized_number_idx
  on public.person_documents (normalized_number)
  where document_type = 'cpf';

create or replace function public.resolve_relationship_import_keys(
  p_condominium_id uuid,
  p_unit_codes text[],
  p_cpfs text[]
) returns table(unit_id uuid, unit_code text, person_id uuid, person_cpf text)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_permission('imports.manage', p_condominium_id) then
    raise exception 'Sem permissão para resolver vínculos.' using errcode = '42501';
  end if;
  return query select u.id, u.code, null::uuid, null::text
  from public.units u
  where u.condominium_id = p_condominium_id
    and lower(u.code) = any(p_unit_codes)
  union all select null::uuid, null::text, pd.person_id, pd.normalized_number
  from public.person_documents pd
  join public.person_condominium_links pcl on pcl.person_id = pd.person_id
    and pcl.condominium_id = p_condominium_id and pcl.status = 'active'
  where pd.document_type = 'cpf'
    and pd.normalized_number = any(p_cpfs);
end;
$$;

revoke all on function public.resolve_relationship_import_keys(uuid, text[], text[]) from public, anon;
grant execute on function public.resolve_relationship_import_keys(uuid, text[], text[]) to authenticated;

commit;
