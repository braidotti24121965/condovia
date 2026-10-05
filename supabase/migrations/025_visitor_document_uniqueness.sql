-- Prevent future visitor-document duplicates without modifying existing rows.
-- The advisory lock makes the check safe against concurrent inserts.
create or replace function public.prevent_duplicate_visitor_document()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_document text;
  normalized_type text;
begin
  if new.document_number is null or trim(new.document_number) = '' then
    new.document_number := null;
    return new;
  end if;

  normalized_type := lower(trim(coalesce(new.document_type, '')));
  normalized_document := case
    when normalized_type = 'cpf' then nullif(regexp_replace(new.document_number, '[^0-9]', '', 'g'), '')
    else trim(new.document_number)
  end;

  if normalized_document is null then
    new.document_number := null;
    return new;
  end if;

  new.document_number := normalized_document;
  perform pg_advisory_xact_lock(hashtextextended(
    new.condominium_id::text || '|' || normalized_type || '|' || normalized_document,
    0
  ));

  if exists (
    select 1
    from public.visitors existing
    where existing.condominium_id = new.condominium_id
      and lower(trim(coalesce(existing.document_type, ''))) = normalized_type
      and case
        when normalized_type = 'cpf' then nullif(regexp_replace(existing.document_number, '[^0-9]', '', 'g'), '')
        else nullif(trim(existing.document_number), '')
      end = normalized_document
      and existing.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) then
    raise unique_violation using message = 'visitors_document_duplicate';
  end if;

  return new;
end;
$$;

drop trigger if exists visitors_prevent_duplicate_document on public.visitors;
create trigger visitors_prevent_duplicate_document
before insert or update of condominium_id, document_type, document_number on public.visitors
for each row execute function public.prevent_duplicate_visitor_document();
