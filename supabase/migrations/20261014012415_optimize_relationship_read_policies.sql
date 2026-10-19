drop policy if exists unit_ownerships_admin_read on public.unit_ownerships;
create policy unit_ownerships_admin_read on public.unit_ownerships for select using ((select public.has_permission('ownerships.read', condominium_id)) and exists (select 1 from public.person_condominium_links l where l.person_id = unit_ownerships.person_id and l.condominium_id = unit_ownerships.condominium_id and l.status = 'active'));

drop policy if exists unit_occupancies_admin_read on public.unit_occupancies;
create policy unit_occupancies_admin_read on public.unit_occupancies for select using ((select public.has_permission('residents.read', condominium_id)) and exists (select 1 from public.person_condominium_links l where l.person_id = unit_occupancies.person_id and l.condominium_id = unit_occupancies.condominium_id and l.status = 'active'));

drop policy if exists units_read on public.units;
create policy units_read on public.units for select using ((select public.has_permission('units.read', condominium_id)));

drop policy if exists person_condominium_links_read on public.person_condominium_links;
create policy person_condominium_links_read on public.person_condominium_links for select using (((status = 'active') and (select public.has_permission('people.read', condominium_id))) or public.can_read_own_unit_relationship(person_id, condominium_id));
