create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  postal_code text,
  street text not null check (length(btrim(street)) > 0),
  number text,
  complement text,
  district text,
  city text not null check (length(btrim(city)) > 0),
  state text not null check (length(btrim(state)) > 0),
  country_code text not null default 'BR' check (country_code ~ '^[A-Z]{2}$'),
  latitude numeric,
  longitude numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (latitude is null or latitude between -90 and 90),
  check (longitude is null or longitude between -180 and 180),
  check (postal_code is null or country_code <> 'BR' or postal_code ~ '^[0-9]{8}$')
);

alter table public.condominiums
  add column legal_name text,
  add column document_number text,
  add column email text,
  add column phone text,
  add column condominium_type text not null default 'other',
  add column address_id uuid references public.addresses(id) on delete set null,
  add column timezone text not null default 'America/Sao_Paulo';

alter table public.condominiums
  add constraint condominiums_type_check check (condominium_type in ('vertical', 'horizontal', 'mixed', 'other')),
  add constraint condominiums_name_not_blank check (length(btrim(name)) > 0),
  add constraint condominiums_email_check check (email is null or email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  add constraint condominiums_phone_check check (phone is null or phone ~ '^\+?[0-9]{7,15}$');

create or replace function public.normalize_condominium_profile()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.name := btrim(new.name);
  new.legal_name := nullif(btrim(new.legal_name), '');
  new.document_number := nullif(regexp_replace(coalesce(new.document_number, ''), '[^0-9]', '', 'g'), '');
  new.email := nullif(lower(btrim(coalesce(new.email, ''))), '');
  new.phone := nullif(regexp_replace(coalesce(new.phone, ''), '[^0-9+]', '', 'g'), '');
  new.timezone := btrim(new.timezone);
  if not exists (select 1 from pg_catalog.pg_timezone_names tz where tz.name = new.timezone) then
    raise exception 'Invalid IANA timezone' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger condominiums_normalize_profile before insert or update of name, legal_name, document_number, email, phone, timezone
on public.condominiums for each row execute function public.normalize_condominium_profile();
revoke all on function public.normalize_condominium_profile() from public, anon, authenticated;

create or replace function public.is_valid_cnpj(value text)
returns boolean language plpgsql immutable set search_path = '' as $$
declare digits text; weights1 int[] := array[5,4,3,2,9,8,7,6,5,4,3,2]; weights2 int[] := array[6,5,4,3,2,9,8,7,6,5,4,3,2]; total int; i int; d1 int; d2 int;
begin
  digits := regexp_replace(coalesce(value, ''), '[^0-9]', '', 'g');
  if length(digits) <> 14 or digits ~ '^(.)\1{13}$' then return false; end if;
  total := 0; for i in 1..12 loop total := total + substring(digits, i, 1)::int * weights1[i]; end loop;
  d1 := case when total % 11 < 2 then 0 else 11 - total % 11 end;
  total := 0; for i in 1..12 loop total := total + substring(digits, i, 1)::int * weights2[i]; end loop;
  total := total + d1 * weights2[13]; d2 := case when total % 11 < 2 then 0 else 11 - total % 11 end;
  return substring(digits, 13, 1)::int = d1 and substring(digits, 14, 1)::int = d2;
end $$;
alter table public.condominiums add constraint condominiums_document_number_check
  check (document_number is null or (document_number ~ '^[0-9]{14}$' and public.is_valid_cnpj(document_number)));
create unique index condominiums_active_document_uidx on public.condominiums(document_number)
  where document_number is not null and status = 'active';
create unique index condominiums_address_uidx on public.condominiums(address_id) where address_id is not null;

create index condominiums_address_idx on public.condominiums(address_id) where address_id is not null;
create index addresses_updated_at_idx on public.addresses(updated_at desc);

alter table public.addresses enable row level security;
revoke all on public.addresses from public, anon, authenticated;
grant select, update on public.addresses to authenticated;
create policy addresses_read_through_condominium on public.addresses for select to authenticated
  using (exists (select 1 from public.condominiums c where c.address_id = addresses.id and public.has_permission('condominium.read', c.id)));
create policy addresses_update_through_condominium on public.addresses for update to authenticated
  using (exists (select 1 from public.condominiums c where c.address_id = addresses.id and public.has_permission('condominium.manage', c.id)))
  with check (exists (select 1 from public.condominiums c where c.address_id = addresses.id and public.has_permission('condominium.manage', c.id)));
-- Inserts/deletes happen atomically via save_condominium_profile below, preventing a global address catalog.

alter table public.audit_events drop constraint audit_events_entity_type_check;
alter table public.audit_events add constraint audit_events_entity_type_check check (entity_type in (
  'user_invitation', 'condominium_membership', 'administrator_membership', 'administrator_condominium_access',
  'platform_membership', 'role_assignment', 'permission_override', 'user_account', 'condominium', 'address',
  'condominium_structure', 'unit'
));

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at := now(); return new; end $$;
create trigger addresses_set_updated_at before update on public.addresses for each row execute function public.set_updated_at();
create trigger condominiums_set_updated_at before update on public.condominiums for each row execute function public.set_updated_at();
revoke all on function public.set_updated_at() from public, anon, authenticated;

create or replace function public.audit_condominium_profile_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare payload jsonb; entity text;
begin
  entity := case when tg_table_name = 'addresses' then 'address' else 'condominium' end;
  if tg_op = 'INSERT' then payload := jsonb_build_object('action', 'created');
  else
    payload := jsonb_strip_nulls(jsonb_build_object(
      'action', case when tg_table_name = 'condominiums' and to_jsonb(old)->>'address_id' is distinct from to_jsonb(new)->>'address_id' then 'address_changed' else 'updated' end,
      'changed_fields', (select jsonb_agg(k) from jsonb_each(to_jsonb(new)) n(k,v) join jsonb_each(to_jsonb(old)) o(k,v) using (k) where n.v is distinct from o.v and k not in ('updated_at'))
    ));
    if tg_table_name = 'condominiums' and to_jsonb(old)->>'address_id' is distinct from to_jsonb(new)->>'address_id' then
      insert into public.audit_events(actor_auth_user_id, actor_user_account_id, event_type, entity_type, entity_id, metadata)
      values ((select auth.uid()), public.current_user_account_id(), 'condominium.address_link_changed', 'condominium', new.id,
        jsonb_build_object('old_address_id', old.address_id, 'new_address_id', new.address_id,
          'changed_fields', (select jsonb_agg(k) from jsonb_each(to_jsonb(new)) n(k,v) join jsonb_each(to_jsonb(old)) o(k,v) using (k) where n.v is distinct from o.v and k not in ('updated_at'))));
      return new;
    end if;
  end if;
  if tg_table_name = 'addresses' then
    payload := payload || jsonb_build_object('condominium_id', coalesce(
      nullif(current_setting('condovia.audit_condominium_id', true), '')::uuid,
      (select c.id from public.condominiums c where c.address_id = coalesce(new.id, old.id) limit 1)
    ));
  end if;
  insert into public.audit_events(actor_auth_user_id, actor_user_account_id, event_type, entity_type, entity_id, metadata)
  values ((select auth.uid()), public.current_user_account_id(), entity || '.' || lower(tg_op), entity,
    case when tg_table_name = 'condominiums' then coalesce(new.id, old.id) else coalesce(new.id, old.id) end, payload);
  return coalesce(new, old);
end $$;
create trigger condominiums_profile_audit after insert or update on public.condominiums for each row execute function public.audit_condominium_profile_change();
create trigger addresses_profile_audit after insert or update on public.addresses for each row execute function public.audit_condominium_profile_change();

create or replace function public.save_condominium_profile(
  target_condominium_id uuid, p_name text, p_legal_name text, p_document_number text, p_email text, p_phone text,
  p_condominium_type text, p_timezone text, p_postal_code text, p_street text, p_number text, p_complement text,
  p_district text, p_city text, p_state text, p_country_code text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare current_address uuid; resulting_address uuid;
begin
  if not public.has_permission('condominiums.manage', target_condominium_id) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  perform set_config('condovia.audit_condominium_id', target_condominium_id::text, true);
  select address_id into current_address from public.condominiums where id = target_condominium_id for update;
  if not found then raise exception 'Condominium not found' using errcode = 'P0002'; end if;
  if nullif(btrim(coalesce(p_street, '')), '') is null then
    resulting_address := null;
  elsif current_address is null then
    insert into public.addresses(postal_code, street, number, complement, district, city, state, country_code)
    values (nullif(regexp_replace(coalesce(p_postal_code, ''), '[^0-9]', '', 'g'), ''), btrim(p_street), nullif(btrim(p_number), ''), nullif(btrim(p_complement), ''), nullif(btrim(p_district), ''), btrim(p_city), btrim(p_state), upper(coalesce(nullif(btrim(p_country_code), ''), 'BR')))
    returning id into resulting_address;
  else
    update public.addresses set postal_code = nullif(regexp_replace(coalesce(p_postal_code, ''), '[^0-9]', '', 'g'), ''), street = btrim(p_street), number = nullif(btrim(p_number), ''), complement = nullif(btrim(p_complement), ''), district = nullif(btrim(p_district), ''), city = btrim(p_city), state = btrim(p_state), country_code = upper(coalesce(nullif(btrim(p_country_code), ''), 'BR')) where id = current_address returning id into resulting_address;
  end if;
  update public.condominiums set name = p_name, legal_name = p_legal_name, document_number = p_document_number,
    email = p_email, phone = p_phone, condominium_type = p_condominium_type, timezone = p_timezone, address_id = resulting_address
    where id = target_condominium_id;
  return resulting_address;
end $$;
revoke all on function public.save_condominium_profile(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text) from public, anon;
grant execute on function public.save_condominium_profile(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text) to authenticated;
