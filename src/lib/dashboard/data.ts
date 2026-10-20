import { getGatehouseDashboardSummary } from "@/lib/gatehouse/data";
import { requireUser } from "@/lib/auth/context";
import { hasPermission } from "@/lib/condominium/access";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type DashboardPeriod = "today" | "7d" | "30d";
export type DashboardDistribution = { label: string; value: number };
export const dashboardPermissionCodes = ["units.read", "residents.read", "gatehouse.read", "reservations.read", "occurrences.read", "imports.read", "occurrences.create", "reservations.resources.read", "people.manage", "gatehouse.manage", "imports.manage"] as const;
export const dashboardOccurrencesSelect = "id,occurrence_number,title,status,priority,created_at,category:occurrence_categories!occurrences_category_id_condominium_id_fkey(name)";
export function shouldQueryDashboardModule(permission: boolean) { return permission === true; }
export function applyDashboardCount<T extends { error: unknown | null }>(result: { error: string | null }, response: T, assign: (value: number) => void, count: number | null | undefined) { if (response.error) { result.error = "Não foi possível carregar todos os dados agora."; return false; } assign(count ?? 0); return true; }
export function dashboardPeriodDays(period: DashboardPeriod) { return period === "today" ? 1 : period === "7d" ? 7 : 30; }
export function aggregateDashboardValues(values: string[]) { const counts = new Map<string, number>(); for (const value of values) counts.set(value, (counts.get(value) || 0) + 1); return [...counts.entries()].map(([label, value]) => ({ label, value })); }
export function aggregateDashboardDates(values: string[], timeZone: string) { return aggregateDashboardValues(values.map((value) => dashboardLocalDate(new Date(value), timeZone))).sort((a, b) => a.label.localeCompare(b.label)); }
export function countActiveUrgentOccurrences(rows: Array<{ priority: string; status: string }>) { return rows.filter((row) => row.priority === "urgent" && !["closed", "cancelled"].includes(row.status)).length; }
export function dashboardLocalDate(date: Date, timeZone: string) { const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date); const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value])); return `${values.year}-${values.month}-${values.day}`; }
function formatAddress(address: { street?: string; number?: string | null; city?: string; state?: string } | null) { return address ? [address.street, address.number, address.city, address.state].filter(Boolean).join(", ") : null; }

export type DashboardSupabase = NonNullable<Awaited<ReturnType<typeof createClient>>>;
export type DashboardShell = { supabase: DashboardSupabase; condo: { name: string; type: string; status: string; address: string | null; timezone: string }; permissions: Record<string, boolean>; timeZone: string };
export type DashboardQueryResult<T> = { data: T; error: string | null };

function timed<T>(label: string, request: PromiseLike<T>): Promise<T> {
  const started = performance.now();
  return Promise.resolve(request).then((result) => {
    if (process.env.NODE_ENV === "development" && process.env.CONDOVIA_LOG_SUPABASE_CALLS === "1") {
      console.info("[condovia:dashboard] query", { label, durationMs: Math.round(performance.now() - started) });
    }
    return result;
  });
}

export const getDashboardShell = cache(async (condominiumId: string): Promise<DashboardShell | null> => {
  const { supabase } = await requireUser();
  if (!supabase) return null;
  const [{ data: condo }, ...permissionResults] = await Promise.all([
    timed("condominiums", supabase.from("condominiums").select("name,condominium_type,status,timezone,addresses(street,number,city,state)").eq("id", condominiumId).maybeSingle()),
    ...dashboardPermissionCodes.map((code) => timed(`permission:${code}`, hasPermission(code, condominiumId))),
  ]);
  const permissions = Object.fromEntries(dashboardPermissionCodes.map((code, index) => [code, permissionResults[index].data === true]));
  const timeZone = condo?.timezone || "America/Sao_Paulo";
  return { supabase, timeZone, permissions, condo: { name: condo?.name || "Condomínio", type: condo?.condominium_type || "", status: condo?.status || "", timezone: timeZone, address: formatAddress(condo?.addresses as { street?: string; number?: string | null; city?: string; state?: string } | null) } };
});

export const getDashboardUnits = cache(async (supabase: DashboardSupabase, condominiumId: string): Promise<{ count: number | null; byStatus: DashboardDistribution[]; error: string | null }> => {
  const [{ count, error: countError }, { data, error: statusError }] = await Promise.all([
    timed("units.count.exact", supabase.from("units").select("id", { count: "exact", head: true }).eq("condominium_id", condominiumId).eq("operational_status", "active")),
    timed("units.by_status", supabase.from("units").select("operational_status").eq("condominium_id", condominiumId)),
  ]);
  if (countError || statusError) return { count: null, byStatus: [], error: "Não foi possível carregar todos os dados agora." };
  const buckets = new Map<string, number>(); for (const row of data || []) buckets.set(row.operational_status, (buckets.get(row.operational_status) || 0) + 1);
  return { count: count ?? 0, byStatus: [...buckets.entries()].map(([label, value]) => ({ label, value })), error: null };
});

export const getDashboardResidents = cache(async (supabase: DashboardSupabase, condominiumId: string, today: string): Promise<DashboardQueryResult<number>> => {
  const { count, error } = await timed("unit_occupancies.count.exact", supabase.from("unit_occupancies").select("id", { count: "exact", head: true }).eq("condominium_id", condominiumId).lte("starts_at", today).or(`ends_at.is.null,ends_at.gt.${today}`));
  return { data: count ?? 0, error: error ? "Não foi possível carregar todos os dados agora." : null };
});

export const getDashboardGatehouse = cache(async (condominiumId: string) => timed("getGatehouseDashboardSummary", getGatehouseDashboardSummary(condominiumId)));

export const getDashboardReservations = cache(async (supabase: DashboardSupabase, condominiumId: string, start: string, end: string) => timed("reservations.dashboard", supabase.from("reservations").select("id,created_at,starts_at,resource:reservable_resources(name)").eq("condominium_id", condominiumId).in("status", ["pending", "approved"]).lt("starts_at", end).gte("ends_at", start)));

export const getDashboardOccurrences = cache(async (supabase: DashboardSupabase, condominiumId: string) => timed("occurrences.dashboard", supabase.from("occurrences").select(dashboardOccurrencesSelect).eq("condominium_id", condominiumId).not("status", "in", "(closed,cancelled)")));

export const getDashboardImports = cache(async (supabase: DashboardSupabase, condominiumId: string) => timed("import_batches.dashboard", supabase.from("import_batches").select("id,file_name,entity_type,total_rows,new_rows,duplicate_rows,invalid_rows,created_at,status,created_by_user_account_id").eq("condominium_id", condominiumId).order("created_at", { ascending: false }).limit(8)));
