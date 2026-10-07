create or replace function public.update_my_display_name(p_preferred_name text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_person_id uuid;
  v_name text := pg_catalog.btrim(coalesce(p_preferred_name, ''));
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Autenticação obrigatória.';
  end if;

  if length(v_name) < 1 or length(v_name) > 120 then
    raise exception using errcode = '22023', message = 'O nome de exibição deve ter entre 1 e 120 caracteres.';
  end if;

  select ua.person_id into v_person_id
  from public.user_accounts ua
  where ua.auth_user_id = auth.uid()
    and ua.status = 'active';

  if v_person_id is null then
    raise exception using errcode = '42501', message = 'Conta de usuário não encontrada.';
  end if;

  update public.people
  set preferred_name = v_name, updated_at = now()
  where id = v_person_id;

  if not found then
    raise exception using errcode = '42501', message = 'Pessoa vinculada não encontrada.';
  end if;

  return v_name;
end;
$$;

revoke all on function public.update_my_display_name(text) from public, anon;
grant execute on function public.update_my_display_name(text) to authenticated;
