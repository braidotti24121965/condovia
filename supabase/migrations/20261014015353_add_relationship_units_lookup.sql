create or replace function public.list_relationship_people(p_condominium_id uuid, p_person_ids uuid[])
returns table(id uuid, full_name text)
language sql stable security definer set search_path=''
as $$
  select p.id, p.full_name
  from public.people p
  join public.person_condominium_links l
    on l.person_id=p.id
   and l.condominium_id=p_condominium_id
   and l.status='active'
  where (select public.has_permission('people.read', p_condominium_id))
    and p.id=any(coalesce(p_person_ids,'{}'::uuid[]))
    and p.status='active'
$$;

create or replace function public.list_relationship_units(p_condominium_id uuid, p_unit_ids uuid[])
returns table(id uuid, code text, display_name text, structure_id uuid)
language sql stable security definer set search_path=''
as $$
  select u.id,u.code,u.display_name,u.structure_id
  from public.units u
  where (select public.has_permission('units.read', p_condominium_id))
    and u.condominium_id=p_condominium_id
    and u.id=any(coalesce(p_unit_ids,'{}'::uuid[]))
$$;
