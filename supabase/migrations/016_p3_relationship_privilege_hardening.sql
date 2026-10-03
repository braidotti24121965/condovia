-- P3 privilege hardening for relationship history tables.
-- Provenance: the linked Supabase project's pg_default_acl grants broad table
-- privileges (including DELETE and TRUNCATE) to anon/authenticated/service_role
-- for tables created by postgres and supabase_admin in public. The same defaults
-- are visible on existing P1/P2 tables. This migration intentionally does not
-- change those system-wide defaults; it removes only DELETE/TRUNCATE from the
-- four P3 tables, preserving other grants and all historical rows.

revoke delete, truncate on table public.person_condominium_links
  from public, anon, authenticated;
revoke delete, truncate on table public.unit_ownerships
  from public, anon, authenticated;
revoke delete, truncate on table public.unit_occupancies
  from public, anon, authenticated;
revoke delete, truncate on table public.unit_financial_responsibilities
  from public, anon, authenticated;
