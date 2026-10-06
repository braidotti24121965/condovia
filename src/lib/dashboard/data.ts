import { getGatehouseDashboardSummary } from "@/lib/gatehouse/data";
import { requireUser } from "@/lib/auth/context";

export type DashboardPeriod = "today" | "7d" | "30d";
export type DashboardActivity = { id: string; label: string; at: string; href: string };
export type CondominiumDashboard = {
  period: DashboardPeriod; timeZone: string; permissions: Record<string, boolean>;
  units: number | null; residents: number | null; visitorsInside: number | null; packagesWaiting: number | null;
  reservations: number | null; occurrencesOpen: number | null; occurrencesTriage: number | null; occurrencesUrgent: number | null;
  activity: DashboardActivity[]; error: string | null;
};
export const dashboardPermissionCodes = ["units.read", "residents.read", "gatehouse.read", "reservations.read", "occurrences.read"] as const;
export function shouldQueryDashboardModule(permission: boolean) { return permission === true; }
export function applyDashboardCount<T extends { error: unknown | null }>(result: { error: string | null }, response: T, assign: (value: number) => void, count: number | null | undefined) {
  if (response.error) { result.error = "Não foi possível carregar todas as métricas agora."; return false; }
  assign(count ?? 0); return true;
}
export function dashboardPeriodDays(period: DashboardPeriod) { return period === "today" ? 1 : period === "7d" ? 7 : 30; }
export function dashboardLocalDate(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return values.year + "-" + values.month + "-" + values.day;
}
function addDays(date: Date, days: number) { const copy = new Date(date); copy.setUTCDate(copy.getUTCDate() + days); return copy; }

export async function getCondominiumDashboard(condominiumId: string, period: DashboardPeriod = "today"): Promise<CondominiumDashboard> {
  const { supabase } = await requireUser();
  const empty = { period, timeZone: "America/Sao_Paulo", permissions: {}, units: null, residents: null, visitorsInside: null, packagesWaiting: null, reservations: null, occurrencesOpen: null, occurrencesTriage: null, occurrencesUrgent: null, activity: [], error: null } satisfies CondominiumDashboard;
  if (!supabase) return empty;
  const { data: condo } = await supabase.from("condominiums").select("timezone").eq("id", condominiumId).maybeSingle();
  const timeZone = condo?.timezone || "America/Sao_Paulo";
  const now = new Date(); const today = dashboardLocalDate(now, timeZone); const start = addDays(now, -(dashboardPeriodDays(period) - 1)).toISOString(); const end = addDays(now, 1).toISOString();
  const permissionResults = await Promise.all(dashboardPermissionCodes.map((permission_code) => supabase.rpc("has_permission", { permission_code, target_condominium_id: condominiumId })));
  const permissions = Object.fromEntries(dashboardPermissionCodes.map((code, index) => [code, permissionResults[index].data === true]));
  const result: CondominiumDashboard = { ...empty, timeZone, permissions, period };
  const recordQueryError = (error: { message?: string } | null) => { if (error && !result.error) result.error = "Não foi possível carregar todas as métricas agora."; };
  const tasks: Array<PromiseLike<void>> = [];
  if (shouldQueryDashboardModule(permissions["units.read"])) tasks.push(supabase.from("units").select("id", { count: "exact", head: true }).eq("condominium_id", condominiumId).eq("operational_status", "active").then((response) => { applyDashboardCount(result, response, (value) => { result.units = value; }, response.count); }));
  if (shouldQueryDashboardModule(permissions["residents.read"])) tasks.push(supabase.from("unit_occupancies").select("id", { count: "exact", head: true }).eq("condominium_id", condominiumId).lte("starts_at", today).or("ends_at.is.null,ends_at.gt." + today).then((response) => { applyDashboardCount(result, response, (value) => { result.residents = value; }, response.count); }));
  if (shouldQueryDashboardModule(permissions["gatehouse.read"])) tasks.push(getGatehouseDashboardSummary(condominiumId).then((summary) => { result.visitorsInside = summary.insideNowCount; result.packagesWaiting = summary.waitingPackagesCount; }));
  if (shouldQueryDashboardModule(permissions["reservations.read"])) tasks.push(supabase.from("reservations").select("id", { count: "exact", head: true }).eq("condominium_id", condominiumId).in("status", ["pending", "approved"]).lt("starts_at", end).gte("ends_at", start).then((response) => { applyDashboardCount(result, response, (value) => { result.reservations = value; }, response.count); }));
  if (shouldQueryDashboardModule(permissions["occurrences.read"])) tasks.push(supabase.from("occurrences").select("id,status,priority,created_at,title").eq("condominium_id", condominiumId).not("status", "in", "(closed,cancelled)").then(({ data, error }) => { recordQueryError(error); if (error) return; const rows = data || []; result.occurrencesOpen = rows.filter((row) => row.status === "open").length; result.occurrencesTriage = rows.filter((row) => row.status === "triage").length; result.occurrencesUrgent = rows.filter((row) => row.priority === "urgent").length; result.activity.push(...rows.filter((row) => row.created_at >= start && row.created_at < end).map((row) => ({ id: "occurrence-" + row.id, label: "Ocorrência: " + row.title, at: row.created_at, href: "/app/occurrences" }))); }));
  if (shouldQueryDashboardModule(permissions["reservations.read"])) tasks.push(supabase.from("reservations").select("id,created_at,resource:reservable_resources(name)").eq("condominium_id", condominiumId).gte("created_at", start).lt("created_at", end).order("created_at", { ascending: false }).limit(10).then(({ data, error }) => { recordQueryError(error); if (error) return; result.activity.push(...(data || []).map((row) => ({ id: "reservation-" + row.id, label: "Reserva: " + ((row.resource as { name?: string } | null)?.name || "recurso"), at: row.created_at, href: "/app/reservations" }))); }));
  if (shouldQueryDashboardModule(permissions["gatehouse.read"])) tasks.push(supabase.from("access_events").select("id,event_type,occurred_at").eq("condominium_id", condominiumId).gte("occurred_at", start).lt("occurred_at", end).order("occurred_at", { ascending: false }).limit(10).then(({ data, error }) => { recordQueryError(error); if (error) return; result.activity.push(...(data || []).map((row) => ({ id: "access-" + row.id, label: row.event_type === "entry" ? "Entrada registrada" : "Saída registrada", at: row.occurred_at, href: "/app/gatehouse/history" }))); }));
  if (shouldQueryDashboardModule(permissions["gatehouse.read"])) tasks.push(supabase.from("packages").select("id,received_at").eq("condominium_id", condominiumId).gte("received_at", start).lt("received_at", end).order("received_at", { ascending: false }).limit(10).then(({ data, error }) => { recordQueryError(error); if (error) return; result.activity.push(...(data || []).map((row) => ({ id: "package-" + row.id, label: "Encomenda recebida", at: row.received_at, href: "/app/gatehouse/packages" }))); }));
  await Promise.all(tasks);
  result.activity = result.activity.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 8);
  return result;
}
