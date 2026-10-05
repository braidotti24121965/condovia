-- Keep operational visitors.read and authorization-linked resident visibility,
-- and allow residents to read only visitors from requests they can themselves
-- read for an eligible unit in the same condominium.
drop policy if exists "visitors_read" on public.visitors;
create policy "visitors_read" on public.visitors
  for select to authenticated
  using (
    public.has_permission('visitors.read', condominium_id)
    or (
      public.has_permission('access_authorizations.read', condominium_id)
      and exists (
        select 1
        from public.access_authorizations aa
        where aa.visitor_id = visitors.id
          and aa.condominium_id = visitors.condominium_id
          and public.is_unit_eligible_for_resident(aa.unit_id, aa.condominium_id)
      )
    )
    or (
      public.has_permission('access_authorizations.read', condominium_id)
      and exists (
        select 1
        from public.access_requests ar
        where ar.visitor_id = visitors.id
          and ar.condominium_id = visitors.condominium_id
          and public.has_permission('access_authorizations.read', ar.condominium_id)
          and public.is_unit_eligible_for_resident(ar.unit_id, ar.condominium_id)
      )
    )
  );
