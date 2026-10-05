-- Allow residents to read only visitors referenced by authorizations for units
-- they are currently eligible to access. Keep the existing operational read
-- permission unchanged for portaria and management roles.
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
          and public.is_unit_eligible_for_resident(
            aa.unit_id,
            aa.condominium_id
          )
      )
    )
  );
