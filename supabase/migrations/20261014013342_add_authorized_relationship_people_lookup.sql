create or replace function public.list_relationship_people(p_condominium_id uuid, p_person_ids uuid[])
returns table(id uuid, full_name text)
language sql
stable
security definer
set search_path to ''
as $function$
  select p.id, p.full_name
  from public.people p
  join public.person_condominium_links l
    on l.person_id = p.id
   and l.condominium_id = p_condominium_id
   and l.status = 'active'
  where (select public.has_permission('people.read', p_condominium_id))
    and p.id = any(coalesce(p_person_ids, '{}'::uuid[]))
    and p.status = 'active'
$function$;
