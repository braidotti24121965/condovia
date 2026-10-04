-- P3 least-privilege ACLs for person/unit relationship tables.
revoke all privileges on table public.person_condominium_links
  from public, anon, authenticated;
revoke all privileges on table public.unit_ownerships
  from public, anon, authenticated;
revoke all privileges on table public.unit_occupancies
  from public, anon, authenticated;
revoke all privileges on table public.unit_financial_responsibilities
  from public, anon, authenticated;

grant select on table public.person_condominium_links to authenticated;
grant update (status) on table public.person_condominium_links to authenticated;
grant select, insert, update on table public.unit_ownerships to authenticated;
grant select, insert, update on table public.unit_occupancies to authenticated;
grant select, insert, update on table public.unit_financial_responsibilities to authenticated;
