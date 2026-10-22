-- 20261020190000_visitor_pass_qr.sql
-- Visitor pass QR: opaque per-authorization token (only its SHA-256 hash is stored)
-- and a public RPC that resolves the pass from that token.

alter table public.access_authorizations
  add column if not exists pass_token_hash text;

create unique index if not exists access_authorizations_pass_token_hash_idx
  on public.access_authorizations(pass_token_hash)
  where pass_token_hash is not null;

-- The previous UUID-based version was never deployed; replace it.
drop function if exists public.get_visitor_pass(uuid);

create or replace function public.get_visitor_pass(p_token text)
returns table (
  condominium_name text,
  visitor_name text,
  visitor_type text,
  unit_code text,
  valid_from timestamptz,
  valid_until timestamptz,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_token is null or char_length(p_token) < 32 then
    return;
  end if;

  return query
  select
    c.name as condominium_name,
    coalesce(v.full_name, sp.full_name, 'Visitante') as visitor_name,
    case when a.visitor_id is not null then 'Visitante' else 'Prestador de Serviço' end as visitor_type,
    u.code as unit_code,
    a.valid_from,
    a.valid_until,
    a.status
  from public.access_authorizations a
  join public.condominiums c on c.id = a.condominium_id
  join public.units u on u.id = a.unit_id
  left join public.visitors v on v.id = a.visitor_id
  left join public.service_providers sp on sp.id = a.service_provider_id
  where a.pass_token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
    and a.status = 'approved';
end;
$$;

revoke all on function public.get_visitor_pass(text) from public;
grant execute on function public.get_visitor_pass(text) to anon, authenticated;
