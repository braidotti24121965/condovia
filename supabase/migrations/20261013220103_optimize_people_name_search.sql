create index if not exists people_full_name_lower_idx on public.people (lower(full_name));

create or replace function public.list_people_for_condominium(
  p_condominium_id uuid,
  p_limit integer default 25,
  p_offset integer default 0,
  p_query text default null,
  p_status text default null
)
returns table (id uuid, full_name text, preferred_name text, status text, birth_date date, created_at timestamptz, total_count bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_permission('people.read', p_condominium_id) then raise exception 'not authorized'; end if;
  return query
  select p.id,p.full_name,p.preferred_name,p.status,p.birth_date,p.created_at,count(*) over ()
  from public.people p
  join public.person_condominium_links l on l.person_id=p.id and l.condominium_id=p_condominium_id and l.status='active'
  where (nullif(trim(p_query),'') is null or lower(p.full_name) like '%' || lower(trim(p_query)) || '%')
    and (nullif(trim(p_status),'') is null or p.status=p_status)
  order by p.full_name
  limit greatest(1,least(coalesce(p_limit,25),100)) offset greatest(0,coalesce(p_offset,0));
end $$;
revoke all on function public.list_people_for_condominium(uuid,integer,integer,text,text) from public, anon;
grant execute on function public.list_people_for_condominium(uuid,integer,integer,text,text) to authenticated;
