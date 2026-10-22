-- 20261022110000_gatehouse_photos_storage_policies.sql
-- Access rules for the private bucket `gatehouse-photos`.
-- Object path is `<condominium_id>/<visitors|providers>/<id>.jpg`, so the first folder
-- is the condominium the photo belongs to. Access is checked against that condominium.
-- Photos are never public: the app reads them through short-lived signed URLs.

-- Returns the condominium id from the first path segment, or null when the path is malformed.
create or replace function public.gatehouse_photo_condominium_id(object_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when (storage.foldername(object_name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then ((storage.foldername(object_name))[1])::uuid
    else null
  end
$$;

drop policy if exists "gatehouse_photos_read" on storage.objects;
create policy "gatehouse_photos_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'gatehouse-photos'
    and (
      public.has_permission('visitors.read', public.gatehouse_photo_condominium_id(name))
      or public.has_permission('providers.read', public.gatehouse_photo_condominium_id(name))
    )
  );

drop policy if exists "gatehouse_photos_insert" on storage.objects;
create policy "gatehouse_photos_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'gatehouse-photos'
    and (
      public.has_permission('visitors.manage', public.gatehouse_photo_condominium_id(name))
      or public.has_permission('providers.manage', public.gatehouse_photo_condominium_id(name))
    )
  );

drop policy if exists "gatehouse_photos_delete" on storage.objects;
create policy "gatehouse_photos_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'gatehouse-photos'
    and (
      public.has_permission('visitors.manage', public.gatehouse_photo_condominium_id(name))
      or public.has_permission('providers.manage', public.gatehouse_photo_condominium_id(name))
    )
  );

-- No update policy: a photo is written once. Replacing a photo means a new object and a new path.
