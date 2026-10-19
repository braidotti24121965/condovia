drop policy if exists people_admin_read on public.people;
create policy people_admin_read on public.people
for select
using (
  exists (
    select 1
    from public.person_condominium_links l
    where l.person_id = people.id
      and l.status = 'active'
      and (select public.has_permission('people.read', l.condominium_id))
  )
);
