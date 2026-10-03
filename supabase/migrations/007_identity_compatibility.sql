-- P1 identity additions. Legacy state values remain valid until explicitly migrated.
alter table public.people
  add column birth_date date;

alter table public.people drop constraint people_status_check;
alter table public.people
  add constraint people_status_check
  check (status in ('active', 'inactive', 'anonymized', 'suspended', 'archived'));

alter table public.user_accounts drop constraint user_accounts_status_check;
alter table public.user_accounts
  add constraint user_accounts_status_check
  check (status in ('invited', 'active', 'suspended', 'disabled', 'closed'));
alter table public.user_accounts add column last_login_at timestamptz;

alter table public.person_documents
  add column normalized_number text,
  add column issuing_authority text,
  add column country_code text,
  add column is_primary boolean not null default false;
alter table public.person_documents
  add constraint person_documents_type_check
  check (document_type in ('cpf', 'rg', 'passport', 'other')) not valid;
create unique index person_documents_primary_per_person_idx
  on public.person_documents(person_id) where is_primary;
comment on column public.person_documents.normalized_number is
  'P1 normalized document value. Nullable for legacy hash-only rows; never derived from document_hash.';

alter table public.person_phones
  add column phone_type text not null default 'mobile',
  add column is_whatsapp boolean not null default false,
  add column is_verified boolean not null default false;
alter table public.person_phones
  add constraint person_phones_type_check
  check (phone_type in ('mobile', 'landline', 'work', 'other')) not valid;
create unique index person_phones_primary_per_person_idx
  on public.person_phones(person_id) where is_primary;

alter table public.person_emails
  add column normalized_email text generated always as (lower(btrim(email))) stored,
  add column is_verified boolean not null default false;
create unique index person_emails_normalized_per_person_idx
  on public.person_emails(person_id, normalized_email);
create unique index person_emails_primary_per_person_idx
  on public.person_emails(person_id) where is_primary;

create or replace function public.sync_person_contact_verification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.verified_at is not null then
      new.is_verified := true;
    elsif new.is_verified then
      new.verified_at := now();
    end if;
  elsif new.is_verified is distinct from old.is_verified
      and new.verified_at is not distinct from old.verified_at then
    new.verified_at := case when new.is_verified then now() else null end;
  else
    new.is_verified := new.verified_at is not null;
  end if;
  return new;
end
$$;
create trigger person_phones_sync_verification
before insert or update of is_verified, verified_at on public.person_phones
for each row execute function public.sync_person_contact_verification();
create trigger person_emails_sync_verification
before insert or update of is_verified, verified_at on public.person_emails
for each row execute function public.sync_person_contact_verification();
revoke all on function public.sync_person_contact_verification() from public, anon, authenticated;

alter table public.user_invitations
  add column person_id uuid references public.people(id),
  add column invitation_type text,
  add column condominium_id uuid references public.condominiums(id),
  add column administrator_id uuid references public.administrators(id),
  add column platform_scope boolean not null default false,
  add column accepted_at timestamptz;
alter table public.user_invitations
  add constraint user_invitations_type_check
    check (invitation_type is null or invitation_type in ('condominium', 'administrator', 'platform')) not valid,
  add constraint user_invitations_p1_status_check
    check (status in ('pending', 'accepted', 'expired', 'revoked')) not valid,
  add constraint user_invitations_scope_check
    check (
      num_nonnulls(condominium_id, administrator_id, nullif(platform_scope, false)::boolean) <= 1
      and (
        invitation_type is null
        or (invitation_type = 'condominium' and condominium_id is not null
          and administrator_id is null and not platform_scope)
        or (invitation_type = 'administrator' and administrator_id is not null
          and condominium_id is null and not platform_scope)
        or (invitation_type = 'platform' and platform_scope
          and condominium_id is null and administrator_id is null)
      )
    ) not valid;
create index user_invitations_person_status_idx
  on public.user_invitations(person_id, status) where person_id is not null;
create index user_invitations_condominium_status_idx
  on public.user_invitations(condominium_id, status) where condominium_id is not null;
create index user_invitations_administrator_status_idx
  on public.user_invitations(administrator_id, status) where administrator_id is not null;

comment on column public.user_invitations.token_hash is
  'Only a token hash may be persisted. Raw invitation tokens must never be stored or audited.';
