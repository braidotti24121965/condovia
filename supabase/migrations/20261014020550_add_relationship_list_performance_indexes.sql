create index if not exists unit_ownerships_condo_starts_person_unit_idx on public.unit_ownerships (condominium_id, starts_at desc, person_id, unit_id);
create index if not exists unit_occupancies_condo_starts_person_unit_idx on public.unit_occupancies (condominium_id, starts_at desc, person_id, unit_id);
create index if not exists person_condominium_links_condo_status_person_idx on public.person_condominium_links (condominium_id, status, person_id);
create index if not exists units_condo_code_idx on public.units (condominium_id, code);
create index if not exists people_full_name_lower_idx on public.people ((lower(full_name)));
