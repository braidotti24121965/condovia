grant delete on public.import_batches to authenticated;
create policy import_batches_delete on public.import_batches for delete to authenticated
  using (public.has_permission('imports.manage', condominium_id));
