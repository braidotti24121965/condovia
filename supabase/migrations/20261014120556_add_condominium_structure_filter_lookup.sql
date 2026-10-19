create or replace function public.list_structures_for_condominium(p_condominium_id uuid)
returns table(id uuid, name text)
language sql stable security definer set search_path=''
as $$
  select s.id,s.name
  from public.condominium_structures s
  where (select public.has_permission('units.read', p_condominium_id))
    and s.condominium_id=p_condominium_id
  order by s.name
$$;
