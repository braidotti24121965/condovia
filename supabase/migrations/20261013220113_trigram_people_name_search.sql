create extension if not exists pg_trgm;
create index if not exists people_full_name_trgm_idx on public.people using gin (full_name gin_trgm_ops);
