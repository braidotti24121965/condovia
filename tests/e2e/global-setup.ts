import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const localURL = "http://127.0.0.1:15421";
const localProjectId = "condovia-mvp0";
const databaseContainer = "supabase_db_condovia-mvp0";
const fixture = {
  client: "a1000000-0000-4000-8000-000000000001",
  condominium: "c1000000-0000-4000-8000-000000000001",
  structure: "d1000000-0000-4000-8000-000000000001",
  unit: "e1000000-0000-4000-8000-000000000001",
  accessPoint: "a4000000-0000-4000-8000-000000000001",
  doormanPerson: "b1000000-0000-4000-8000-000000000001",
  residentPerson: "b1000000-0000-4000-8000-000000000002",
  doormanAccount: "aa100000-0000-4000-8000-000000000001",
  residentAccount: "aa100000-0000-4000-8000-000000000002",
  doormanMembership: "f1000000-0000-4000-8000-000000000001",
  residentMembership: "f1000000-0000-4000-8000-000000000002",
  doormanLink: "f9700000-0000-4000-8000-000000000010",
  residentLink: "f9700000-0000-4000-8000-000000000009",
  doormanAssignment: "f9700000-0000-4000-8000-000000000014",
  residentAssignment: "f9700000-0000-4000-8000-000000000013",
  ownership: "f9700000-0000-4000-8000-000000000015",
  occupancy: "f9700000-0000-4000-8000-000000000016",
} as const;

type Credentials = { email: string; password: string };

function configuredLocalURL() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) return process.env.NEXT_PUBLIC_SUPABASE_URL;
  try {
    const envText = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    const line = envText.split(/\r?\n/).find((entry) => entry.startsWith("NEXT_PUBLIC_SUPABASE_URL="));
    return line?.slice(line.indexOf("=") + 1).trim().replace(/^['"]|['"]$/g, "");
  } catch {
    return undefined;
  }
}

function requiredCredentials(prefix: "E2E_RESIDENT" | "E2E_DOORMAN"): Credentials {
  const email = process.env[`${prefix}_EMAIL`]?.trim().toLowerCase();
  const password = process.env[`${prefix}_PASSWORD`];
  if (!email || !password) throw new Error(`Configure ${prefix}_EMAIL e ${prefix}_PASSWORD no ambiente local.`);
  if (!/@(?:condovia\.local|example\.test)$/.test(email)) {
    throw new Error(`${prefix}_EMAIL deve usar um domínio sintético .local ou example.test.`);
  }
  if (password.length < 8) throw new Error(`${prefix}_PASSWORD deve ter pelo menos 8 caracteres.`);
  return { email, password };
}

function requireLocalProjectConfig() {
  const config = readFileSync(resolve(process.cwd(), "supabase/config.toml"), "utf8");
  if (!/^project_id\s*=\s*"condovia-mvp0"\s*$/m.test(config) || !/^port\s*=\s*15421\s*$/m.test(config)) {
    throw new Error("Setup interrompido: supabase/config.toml não identifica o projeto local CondoVia esperado.");
  }
}

function requireLocalDatabaseContainer() {
  const result = spawnSync("docker", [
    "inspect",
    "--format",
    '{{.Name}}|{{index .Config.Labels "com.docker.compose.project"}}',
    databaseContainer,
  ], { encoding: "utf8", timeout: 10_000 });
  if (result.status !== 0 || result.stdout.trim() !== `/${databaseContainer}|${localProjectId}`) {
    throw new Error("Setup interrompido: o container PostgreSQL não corresponde ao projeto CondoVia local.");
  }
}

function runLocalPostgres(sql: string) {
  const result = spawnSync("docker", [
    "exec", "-i", databaseContainer,
    "psql", "-X", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres", "-A", "-t", "-q",
  ], { input: sql, encoding: "utf8", timeout: 30_000, maxBuffer: 2 * 1024 * 1024 });
  if (result.status !== 0) {
    const code = result.stderr.match(/\b(?:SQLSTATE|ERROR):?\s*([0-9A-Z]{5})\b/)?.[1];
    throw new Error(`Provisionamento PostgreSQL E2E LOCAL falhou${code ? ` (${code})` : ""}.`);
  }
  return result.stdout.trim();
}

function requireLocalDatabaseIdentity() {
  const identity = runLocalPostgres(`
    select current_database() || '|' || current_user || '|' ||
      case
        when inet_server_port() is null then 'unix-socket'
        when inet_server_addr()::text in ('127.0.0.1', '::1') and inet_server_port() = 5432
          then 'tcp-local|' || inet_server_addr()::text || '|' || inet_server_port()::text
        else 'tcp-nonlocal|' || coalesce(inet_server_addr()::text, 'unknown') || '|' ||
          coalesce(inet_server_port()::text, 'unknown')
      end;
  `);
  if (identity !== "postgres|postgres|unix-socket" &&
      !/^postgres\|postgres\|tcp-local\|(127\.0\.0\.1|::1)\|5432$/.test(identity)) {
    throw new Error("Setup interrompido: a conexão PostgreSQL não é a instância local esperada.");
  }
}

function localServiceRoleKey() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return process.env.SUPABASE_SERVICE_ROLE_KEY;
  const result = spawnSync("supabase", ["status", "-o", "env"], {
    encoding: "utf8",
    timeout: 15_000,
    maxBuffer: 2 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error("Não foi possível obter a chave administrativa do Supabase LOCAL.");
  const match = result.stdout.match(/^(?:SERVICE_ROLE_KEY|SUPABASE_SERVICE_ROLE_KEY)=(?:"([^"]+)"|'([^']+)'|([^\r\n]+))$/m);
  const key = match?.[1] ?? match?.[2] ?? match?.[3]?.trim();
  if (!key) throw new Error("O Supabase CLI não retornou a chave administrativa local.");
  return key;
}

async function findExistingAuthUserId(admin: SupabaseClient, email: string) {
  const perPage = 1000;
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error("Não foi possível consultar usuários do Auth LOCAL.");
    const existing = data.users.find((user) => user.email?.toLowerCase() === email);
    if (existing) return existing.id;
    if (data.users.length < perPage) break;
  }
  throw new Error("A conta Auth E2E sintética esperada não existe no Supabase LOCAL.");
}

function sqlLiteral(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function fixtureSql(residentAuthId: string, doormanAuthId: string) {
  for (const authId of [residentAuthId, doormanAuthId]) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(authId)) {
      throw new Error("Auth retornou identificador inválido para fixture E2E.");
    }
  }

  return `
begin;
-- Minimal actor and unit setup follows supabase/tests/p4_gatehouse.sql (Alpha / 101).
insert into public.clients (id, legal_name)
values (${sqlLiteral(fixture.client)}, 'P4 Test Client')
on conflict (id) do update set legal_name = excluded.legal_name;

insert into public.condominiums (id, client_id, name, timezone)
values (${sqlLiteral(fixture.condominium)}, ${sqlLiteral(fixture.client)}, 'Condo P4 Alpha', 'America/Sao_Paulo')
on conflict (id) do update set client_id = excluded.client_id, name = excluded.name, timezone = excluded.timezone, status = 'active';

insert into public.condominium_structures (id, condominium_id, name, structure_type)
values (${sqlLiteral(fixture.structure)}, ${sqlLiteral(fixture.condominium)}, 'Torre 1', 'tower')
on conflict (id) do update set condominium_id = excluded.condominium_id, name = excluded.name, structure_type = excluded.structure_type, status = 'active';

insert into public.units (id, condominium_id, structure_id, code, unit_type)
values (${sqlLiteral(fixture.unit)}, ${sqlLiteral(fixture.condominium)}, ${sqlLiteral(fixture.structure)}, '101', 'apartment')
on conflict (id) do update set condominium_id = excluded.condominium_id, structure_id = excluded.structure_id, code = excluded.code, unit_type = excluded.unit_type, operational_status = 'active';

insert into public.access_points (id, condominium_id, name, type, status)
values (${sqlLiteral(fixture.accessPoint)}, ${sqlLiteral(fixture.condominium)}, 'E2E Portaria Principal', 'mixed', 'active')
on conflict (id) do update
set type = excluded.type, status = excluded.status, updated_at = now()
where public.access_points.name = excluded.name
  and public.access_points.condominium_id = excluded.condominium_id;

do $fixture_guard$
begin
  if exists (
    select 1 from public.access_points
    where condominium_id = ${sqlLiteral(fixture.condominium)}
      and name = 'E2E Portaria Principal'
      and id <> ${sqlLiteral(fixture.accessPoint)}
  ) or not exists (
    select 1 from public.access_points
    where id = ${sqlLiteral(fixture.accessPoint)}
      and condominium_id = ${sqlLiteral(fixture.condominium)}
      and name = 'E2E Portaria Principal'
      and type = 'mixed'
      and status = 'active'
  ) then
    raise exception 'Fixture de access point E2E ausente ou em conflito.';
  end if;
end;
$fixture_guard$;

insert into public.people (id, full_name, status) values
  (${sqlLiteral(fixture.doormanPerson)}, 'Porteiro Alpha', 'active'),
  (${sqlLiteral(fixture.residentPerson)}, 'Fernando Morador', 'active')
on conflict (id) do update set full_name = excluded.full_name, status = excluded.status;

insert into public.person_condominium_links (id, person_id, condominium_id, status) values
  (${sqlLiteral(fixture.doormanLink)}, ${sqlLiteral(fixture.doormanPerson)}, ${sqlLiteral(fixture.condominium)}, 'active'),
  (${sqlLiteral(fixture.residentLink)}, ${sqlLiteral(fixture.residentPerson)}, ${sqlLiteral(fixture.condominium)}, 'active')
on conflict (id) do update set person_id = excluded.person_id, condominium_id = excluded.condominium_id, status = excluded.status;

insert into public.user_accounts (id, auth_user_id, person_id, status) values
  (${sqlLiteral(fixture.doormanAccount)}, ${sqlLiteral(doormanAuthId)}, ${sqlLiteral(fixture.doormanPerson)}, 'active'),
  (${sqlLiteral(fixture.residentAccount)}, ${sqlLiteral(residentAuthId)}, ${sqlLiteral(fixture.residentPerson)}, 'active')
on conflict (id) do update set auth_user_id = excluded.auth_user_id, person_id = excluded.person_id, status = excluded.status;

insert into public.condominium_memberships (id, condominium_id, user_account_id, status) values
  (${sqlLiteral(fixture.doormanMembership)}, ${sqlLiteral(fixture.condominium)}, ${sqlLiteral(fixture.doormanAccount)}, 'active'),
  (${sqlLiteral(fixture.residentMembership)}, ${sqlLiteral(fixture.condominium)}, ${sqlLiteral(fixture.residentAccount)}, 'active')
on conflict (id) do update set condominium_id = excluded.condominium_id, user_account_id = excluded.user_account_id, status = 'active', ends_at = null;

insert into public.role_assignments (id, user_account_id, role_id, condominium_id, status)
select ${sqlLiteral(fixture.doormanAssignment)}, ${sqlLiteral(fixture.doormanAccount)}, r.id, ${sqlLiteral(fixture.condominium)}, 'active'
from public.roles r where r.code = 'condominium.doorman'
on conflict (id) do update set user_account_id = excluded.user_account_id, role_id = excluded.role_id, condominium_id = excluded.condominium_id, administrator_id = null, platform_scope = false, status = 'active', ends_at = null;

insert into public.role_assignments (id, user_account_id, role_id, condominium_id, status)
select ${sqlLiteral(fixture.residentAssignment)}, ${sqlLiteral(fixture.residentAccount)}, r.id, ${sqlLiteral(fixture.condominium)}, 'active'
from public.roles r where r.code = 'condominium.resident'
on conflict (id) do update set user_account_id = excluded.user_account_id, role_id = excluded.role_id, condominium_id = excluded.condominium_id, administrator_id = null, platform_scope = false, status = 'active', ends_at = null;

insert into public.unit_ownerships (id, condominium_id, unit_id, person_id, ownership_percentage, starts_at)
values (${sqlLiteral(fixture.ownership)}, ${sqlLiteral(fixture.condominium)}, ${sqlLiteral(fixture.unit)}, ${sqlLiteral(fixture.residentPerson)}, 100, '2026-01-01')
on conflict (id) do update set condominium_id = excluded.condominium_id, unit_id = excluded.unit_id, person_id = excluded.person_id, ownership_percentage = excluded.ownership_percentage, starts_at = excluded.starts_at, ends_at = null;

insert into public.unit_occupancies (id, condominium_id, unit_id, person_id, occupancy_type, is_primary, starts_at)
values (${sqlLiteral(fixture.occupancy)}, ${sqlLiteral(fixture.condominium)}, ${sqlLiteral(fixture.unit)}, ${sqlLiteral(fixture.residentPerson)}, 'owner', true, '2026-01-01')
on conflict (id) do update set condominium_id = excluded.condominium_id, unit_id = excluded.unit_id, person_id = excluded.person_id, occupancy_type = excluded.occupancy_type, is_primary = excluded.is_primary, starts_at = excluded.starts_at, ends_at = null;

commit;
`;
}

export default async function globalSetup() {
  const resident = requiredCredentials("E2E_RESIDENT");
  const doorman = requiredCredentials("E2E_DOORMAN");
  if (resident.email === doorman.email) throw new Error("As contas E2E de resident e doorman devem usar e-mails diferentes.");

  if (configuredLocalURL() !== localURL) {
    throw new Error("Setup E2E interrompido: NEXT_PUBLIC_SUPABASE_URL deve ser exatamente http://127.0.0.1:15421.");
  }
  requireLocalProjectConfig();
  requireLocalDatabaseContainer();
  requireLocalDatabaseIdentity();

  const health = await fetch(`${localURL}/auth/v1/health`).catch(() => undefined);
  if (!health?.ok) throw new Error("Supabase LOCAL não está respondendo; nenhum fixture foi alterado.");

  const admin = createClient(localURL, localServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const [residentAuthId, doormanAuthId] = await Promise.all([
    findExistingAuthUserId(admin, resident.email),
    findExistingAuthUserId(admin, doorman.email),
  ]);

  runLocalPostgres(fixtureSql(residentAuthId, doormanAuthId));

  const results = await Promise.all([
    admin.auth.admin.updateUserById(residentAuthId, { password: resident.password, email_confirm: true }),
    admin.auth.admin.updateUserById(doormanAuthId, { password: doorman.password, email_confirm: true }),
  ]);
  if (results.some((result) => result.error)) throw new Error("Não foi possível atualizar as senhas das contas Auth E2E LOCAIS.");
}
