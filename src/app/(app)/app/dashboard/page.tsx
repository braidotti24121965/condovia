import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, AlertTriangle, CalendarDays, Home, Package, ShieldAlert, UserRound, Users } from "lucide-react";
import { DashboardPeriodFilter } from "@/components/dashboard/dashboard-period-filter";
import { EmptyState } from "@/components/ui/feedback";
import { requireCurrentContext } from "@/lib/auth/context";
import { getCondominiumDashboard, type DashboardPeriod } from "@/lib/dashboard/data";
import { formatDateTimeInTimezone } from "@/lib/gatehouse/timezone";
export const metadata: Metadata = { title: "Painel" };
const periods = new Set<DashboardPeriod>(["today", "7d", "30d"]);
const metricLinks: Record<string, string> = { units: "/app/condominium/units", residents: "/app/condominium/residents", visitors: "/app/gatehouse", packages: "/app/gatehouse/packages", reservations: "/app/reservations", open: "/app/occurrences", triage: "/app/occurrences", urgent: "/app/occurrences" };
function Metric({ id, label, value, icon: Icon, permission, note }: { id: string; label: string; value: number | null; icon: typeof Home; permission: boolean; note?: string }) {
  if (!permission) return null;
  return <Link className="dashboard-metric" href={metricLinks[id]}><span className="dashboard-metric-icon"><Icon size={19} /></span><span className="dashboard-metric-label">{label}</span><strong>{value ?? "—"}</strong>{note && <small>{note}</small>}</Link>;
}
export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const context = await requireCurrentContext();
  if (context.type === "platform") redirect("/app/platform");
  if (context.type !== "condominium") redirect("/app/platform");
  const requested = (await searchParams).period;
  const period = periods.has(requested as DashboardPeriod) ? requested as DashboardPeriod : "today";
  const dashboard = await getCondominiumDashboard(context.id, period);
  if (!Object.values(dashboard.permissions).some(Boolean)) redirect("/no-permission");
  return <div className="cv-page dashboard-operational">
    <div className="page-heading"><div><p className="page-overline">PAINEL OPERACIONAL</p><h1>{context.name}</h1><p>Visão atual do condomínio e das atividades recentes.</p></div><DashboardPeriodFilter period={period} /></div>
    <section className="dashboard-metric-grid" aria-label="Métricas operacionais">
      <Metric id="units" label="Unidades ativas" value={dashboard.units} icon={Home} permission={Boolean(dashboard.permissions["units.read"])} />
      <Metric id="residents" label="Moradores ativos" value={dashboard.residents} icon={Users} permission={Boolean(dashboard.permissions["residents.read"])} />
      <Metric id="visitors" label="Visitantes dentro agora" value={dashboard.visitorsInside} icon={UserRound} permission={Boolean(dashboard.permissions["gatehouse.read"])} note="Estado atual" />
      <Metric id="packages" label="Encomendas aguardando retirada" value={dashboard.packagesWaiting} icon={Package} permission={Boolean(dashboard.permissions["gatehouse.read"])} note="Estado atual" />
      <Metric id="reservations" label={period === "today" ? "Reservas hoje" : "Reservas nos últimos " + (period === "7d" ? "7" : "30") + " dias"} value={dashboard.reservations} icon={CalendarDays} permission={Boolean(dashboard.permissions["reservations.read"])} />
      <Metric id="open" label="Ocorrências abertas" value={dashboard.occurrencesOpen} icon={Activity} permission={Boolean(dashboard.permissions["occurrences.read"])} note="Estado atual" />
      <Metric id="triage" label="Aguardando triagem" value={dashboard.occurrencesTriage} icon={ShieldAlert} permission={Boolean(dashboard.permissions["occurrences.read"])} note="Estado atual" />
      <Metric id="urgent" label="Ocorrências urgentes" value={dashboard.occurrencesUrgent} icon={AlertTriangle} permission={Boolean(dashboard.permissions["occurrences.read"])} note="Estado atual" />
    </section>
    {dashboard.error && <EmptyState title="Não foi possível carregar todas as métricas" description="Tente novamente em instantes. As métricas indisponíveis não foram substituídas por zero." />}
    <section className="cv-panel dashboard-activity-panel"><div className="cv-panel-heading"><div><h2>Atividade recente</h2><p>Eventos dos módulos aos quais você tem acesso.</p></div></div>{dashboard.activity.length ? <ul className="dashboard-activity-list">{dashboard.activity.map((item) => <li key={item.id}><Link href={item.href}><span>{item.label}</span><small>{formatDateTimeInTimezone(item.at, dashboard.timeZone)}</small></Link></li>)}</ul> : <EmptyState title="Nenhuma atividade recente" description="As atividades disponíveis aparecerão aqui quando houver movimentação." />}</section>
    <footer className="dashboard-footer"><span>CondoVia <span>by Kynovia</span></span><span>Dados no fuso de {dashboard.timeZone}</span></footer>
  </div>;
}
