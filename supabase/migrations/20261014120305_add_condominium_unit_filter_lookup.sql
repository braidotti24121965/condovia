create or replace function public.list_units_for_condominium(p_condominium_id uuid)
returns table(id uuid, code text, display_name text, structure_id uuid, operational_status text)
language sql stable security definer set search_path=''
as $$
  select u.id,u.code,u.display_name,u.structure_id,u.operational_status
  from public.units u
  where (select public.has_permission('units.read', p_condominium_id))
    and u.condominium_id=p_condominium_id
  order by u.code
$$;
