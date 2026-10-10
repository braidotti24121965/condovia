create or replace function public.get_my_display_name()
returns text
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select coalesce(nullif(p.preferred_name, ''), p.full_name)
  from public.user_accounts ua
  join public.people p on p.id = ua.person_id
  where ua.auth_user_id = auth.uid()
    and ua.status = 'active';
$$;

revoke all on function public.get_my_display_name() from public, anon;
grant execute on function public.get_my_display_name() to authenticated;
