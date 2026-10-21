create extension if not exists pgtap with schema extensions;
begin;
select plan(8);

-- Deterministic namespace for the visitor pass token test. Every row lives
-- inside this transaction and is removed by ROLLBACK.
insert into public.clients (id, legal_name) values
  ('f9a0c100-0000-4000-8000-000000000001', 'Pass Token Test Client');

insert into public.condominiums (id, client_id, name, timezone) values
  ('f9a0c200-0000-4000-8000-000000000001', 'f9a0c100-0000-4000-8000-000000000001', 'Pass Token Condo', 'America/Sao_Paulo');

insert into public.condominium_structures (id, condominium_id, name, structure_type) values
  ('f9a0c300-0000-4000-8000-000000000001', 'f9a0c200-0000-4000-8000-000000000001', 'Pass Tower', 'tower');

insert into public.units (id, condominium_id, structure_id, code, unit_type) values
  ('f9a0c400-0000-4000-8000-000000000101', 'f9a0c200-0000-4000-8000-000000000001', 'f9a0c300-0000-4000-8000-000000000001', '101', 'apartment');

insert into public.people (id, full_name, status) values
  ('f9a0c500-0000-4000-8000-000000000001', 'Pass Token Resident', 'active');

insert into public.visitors (id, condominium_id, full_name) values
  ('f9a0c800-0000-4000-8000-000000000001', 'f9a0c200-0000-4000-8000-000000000001', 'Pass Token Visitor');

-- Approved authorization with a token, pending authorization with a token,
-- and an approved authorization without any token.
insert into public.access_authorizations (
  id, condominium_id, unit_id, visitor_id, authorized_by_person_id,
  valid_from, valid_until, status, notes, pass_token_hash
) values
  ('f9a0c900-0000-4000-8000-000000000001', 'f9a0c200-0000-4000-8000-000000000001', 'f9a0c400-0000-4000-8000-000000000101', 'f9a0c800-0000-4000-8000-000000000001', 'f9a0c500-0000-4000-8000-000000000001', now() - interval '1 hour', now() + interval '8 hours', 'approved', 'INTERNAL NOTE', encode(sha256(convert_to('pass-token-approved-0000000000000000000000', 'UTF8')), 'hex')),
  ('f9a0c900-0000-4000-8000-000000000002', 'f9a0c200-0000-4000-8000-000000000001', 'f9a0c400-0000-4000-8000-000000000101', 'f9a0c800-0000-4000-8000-000000000001', 'f9a0c500-0000-4000-8000-000000000001', now() - interval '1 hour', now() + interval '8 hours', 'pending', null, encode(sha256(convert_to('pass-token-pending-00000000000000000000000', 'UTF8')), 'hex')),
  ('f9a0c900-0000-4000-8000-000000000003', 'f9a0c200-0000-4000-8000-000000000001', 'f9a0c400-0000-4000-8000-000000000101', 'f9a0c800-0000-4000-8000-000000000001', 'f9a0c500-0000-4000-8000-000000000001', now() - interval '1 hour', now() + interval '8 hours', 'approved', null, null);

-- 1. The function takes the token (text) and no longer accepts the UUID form.
select ok(
  to_regprocedure('public.get_visitor_pass(text)') is not null
  and to_regprocedure('public.get_visitor_pass(uuid)') is null,
  'get_visitor_pass accepts a text token and the UUID version is gone'
);

-- 2. The correct token resolves the approved pass.
select is(
  (select count(*) from public.get_visitor_pass('pass-token-approved-0000000000000000000000')),
  1::bigint,
  'approved pass resolves with its token'
);

-- 3. A wrong token resolves nothing.
select is(
  (select count(*) from public.get_visitor_pass('pass-token-wrong-000000000000000000000000000')),
  0::bigint,
  'unknown token resolves nothing'
);

-- 4. The authorization UUID is not a valid token any more.
select is(
  (select count(*) from public.get_visitor_pass('f9a0c900-0000-4000-8000-000000000001')),
  0::bigint,
  'authorization UUID no longer works as a pass token'
);

-- 5. A pending authorization is not shown, even with a valid token.
select is(
  (select count(*) from public.get_visitor_pass('pass-token-pending-00000000000000000000000')),
  0::bigint,
  'pending pass is not shown with its token'
);

-- 6. The returned row carries no internal notes or identifiers.
select ok(
  pg_get_function_result('public.get_visitor_pass(text)'::regprocedure) not like '%notes%'
  and pg_get_function_result('public.get_visitor_pass(text)'::regprocedure) not like '%condominium_id%',
  'pass result does not expose notes or ids'
);

-- 7. Anonymous visitors can call it (the token is the secret).
select ok(
  has_function_privilege('anon', 'public.get_visitor_pass(text)', 'EXECUTE'),
  'anon can execute get_visitor_pass'
);

-- 8. Tokens are stored as hashes only: no raw token column value is readable.
select ok(
  not exists (
    select 1 from public.access_authorizations
    where pass_token_hash = 'pass-token-approved-0000000000000000000000'
  ),
  'raw token is never stored in the table'
);

select * from finish();
rollback;
