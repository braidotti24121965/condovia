-- Retain every prior membership row while permitting a new period for the same pair.
alter table public.condominium_memberships
  drop constraint condominium_memberships_condominium_id_user_account_id_key;
alter table public.administrator_memberships
  drop constraint administrator_memberships_administrator_id_user_account_id_key;
alter table public.administrator_condominium_access
  drop constraint administrator_condominium_acc_administrator_id_condominium__key;
alter table public.platform_memberships
  drop constraint platform_memberships_user_account_id_key;

alter table public.administrator_condominium_access
  add column starts_at timestamptz not null default now(),
  add column ends_at timestamptz,
  add constraint administrator_condominium_access_period_check
    check (ends_at is null or ends_at > starts_at);
alter table public.platform_memberships
  add column starts_at timestamptz not null default now(),
  add column ends_at timestamptz,
  add constraint platform_memberships_period_check
    check (ends_at is null or ends_at > starts_at);

-- `active` describes the lifecycle state; a row grants access only while its
-- [starts_at, ends_at) period is in force. Serialize writes per identity pair
-- and reject overlapping active periods, while allowing a new period after an
-- expired or ended one. No historical row is deleted or rewritten.
create or replace function public.guard_active_membership_period()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  key_a uuid;
  key_b uuid;
  key_a_column text;
  key_b_column text;
  lock_key text;
  has_overlap boolean;
begin
  if new.status <> 'active' then return new; end if;

  if tg_table_name = 'condominium_memberships' then
    key_a := new.condominium_id; key_b := new.user_account_id;
    key_a_column := 'condominium_id'; key_b_column := 'user_account_id';
  elsif tg_table_name = 'administrator_memberships' then
    key_a := new.administrator_id; key_b := new.user_account_id;
    key_a_column := 'administrator_id'; key_b_column := 'user_account_id';
  elsif tg_table_name = 'administrator_condominium_access' then
    key_a := new.administrator_id; key_b := new.condominium_id;
    key_a_column := 'administrator_id'; key_b_column := 'condominium_id';
  elsif tg_table_name = 'platform_memberships' then
    key_a := new.user_account_id;
    key_a_column := 'user_account_id';
  else
    raise exception 'Unsupported membership table: %', tg_table_name using errcode = '22023';
  end if;

  lock_key := tg_table_name || ':' || key_a::text || ':' || coalesce(key_b::text, '');
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(lock_key, 0));

  if key_b is null then
    execute pg_catalog.format(
      'select exists (select 1 from public.%I m where m.%I = $1 and m.id <> $2 '
      'and m.status = ''active'' '
      'and pg_catalog.tstzrange(m.starts_at, m.ends_at, ''[)'') '
      '&& pg_catalog.tstzrange($3, $4, ''[)''))',
      tg_table_name, key_a_column
    ) into has_overlap using key_a, new.id, new.starts_at, new.ends_at;
  else
    execute pg_catalog.format(
      'select exists (select 1 from public.%I m where m.%I = $1 and m.%I = $2 and m.id <> $3 '
      'and m.status = ''active'' '
      'and pg_catalog.tstzrange(m.starts_at, m.ends_at, ''[)'') '
      '&& pg_catalog.tstzrange($4, $5, ''[)''))',
      tg_table_name, key_a_column, key_b_column
    ) into has_overlap using key_a, key_b, new.id, new.starts_at, new.ends_at;
  end if;

  if has_overlap then
    raise exception 'Active membership periods may not overlap' using errcode = '23P01';
  end if;
  return new;
end
$$;
revoke all on function public.guard_active_membership_period() from public, anon, authenticated;

create trigger condominium_memberships_period_guard
before insert or update of condominium_id, user_account_id, status, starts_at, ends_at
on public.condominium_memberships for each row execute function public.guard_active_membership_period();
create trigger administrator_memberships_period_guard
before insert or update of administrator_id, user_account_id, status, starts_at, ends_at
on public.administrator_memberships for each row execute function public.guard_active_membership_period();
create trigger administrator_condominium_access_period_guard
before insert or update of administrator_id, condominium_id, status, starts_at, ends_at
on public.administrator_condominium_access for each row execute function public.guard_active_membership_period();
create trigger platform_memberships_period_guard
before insert or update of user_account_id, status, starts_at, ends_at
on public.platform_memberships for each row execute function public.guard_active_membership_period();

create index condominium_memberships_effective_idx
  on public.condominium_memberships(user_account_id, condominium_id, starts_at, ends_at)
  where status = 'active';
create index administrator_memberships_effective_idx
  on public.administrator_memberships(user_account_id, administrator_id, starts_at, ends_at)
  where status = 'active';
create index administrator_condominium_access_effective_idx
  on public.administrator_condominium_access(administrator_id, condominium_id, starts_at, ends_at)
  where status = 'active';
create index platform_memberships_effective_idx
  on public.platform_memberships(user_account_id, starts_at, ends_at)
  where status = 'active';
