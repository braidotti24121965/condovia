drop function if exists public.list_people_for_condominium(uuid,integer,integer,text,text);
create function public.list_people_for_condominium(p_condominium_id uuid, p_limit integer default 25, p_offset integer default 0, p_query text default null, p_cpf text default null, p_status text default null)
returns table(id uuid, full_name text, preferred_name text, status text, birth_date date, created_at timestamptz, total_count bigint)
language plpgsql stable security definer set search_path=''
as $function$
begin
  if not public.has_permission('people.read', p_condominium_id) then raise exception 'not authorized'; end if;
  return query
  select p.id,p.full_name,p.preferred_name,p.status,p.birth_date,p.created_at,count(*) over ()
  from public.people p
  join public.person_condominium_links l on l.person_id=p.id and l.condominium_id=p_condominium_id and l.status='active'
  left join public.person_documents d on d.person_id=p.id and d.document_type='cpf'
  where (nullif(trim(p_query),'') is null or lower(coalesce(p.preferred_name,p.full_name)) like '%' || lower(trim(p_query)) || '%' or lower(p.full_name) like '%' || lower(trim(p_query)) || '%')
    and (nullif(trim(p_cpf),'') is null or regexp_replace(coalesce(d.normalized_number,''),'[^0-9]','','g') like '%' || regexp_replace(trim(p_cpf),'[^0-9]','','g') || '%')
    and (nullif(trim(p_status),'') is null or p.status=p_status)
  order by coalesce(p.preferred_name,p.full_name), p.full_name
  limit greatest(1,least(coalesce(p_limit,25),100)) offset greatest(0,coalesce(p_offset,0));
end $function$;
