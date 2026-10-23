import { requireCondominiumPermission } from "@/lib/condominium/access";
import { todayInTimezone } from "@/lib/condominium/people-data";
import { buildWeeklySummary } from "@/lib/summary/weekly-summary";
import { Alert } from "@/components/ui/feedback";

export const metadata = { title: "Resumo da semana" };

export default async function WeeklySummaryPage() {
  const { supabase, context } = await requireCondominiumPermission("dashboard.read");
  const { data: condominium } = await supabase.from("condominiums").select("timezone").eq("id", context.id).maybeSingle();
  const todayIso = todayInTimezone(condominium?.timezone || "America/Sao_Paulo");

  const [occurrences, workOrders, requests, contracts] = await Promise.all([
    supabase.from("occurrences").select("status,priority,created_at,resolved_at").eq("condominium_id", context.id),
    supabase.from("maintenance_work_orders").select("status,due_at").eq("condominium_id", context.id),
    supabase.from("maintenance_requests").select("status,opened_at").eq("condominium_id", context.id),
    supabase.from("maintenance_contracts").select("status,ends_on").eq("condominium_id", context.id),
  ]);

  const failed = occurrences.error || workOrders.error || requests.error || contracts.error;
  if (failed) return <div className="cv-page"><Alert tone="error">Não foi possível carregar o resumo da semana.</Alert></div>;

  const summary = buildWeeklySummary({
    now: new Date(),
    todayIso,
    occurrences: occurrences.data ?? [],
    workOrders: workOrders.data ?? [],
    requests: requests.data ?? [],
    contracts: contracts.data ?? [],
  });

  return <div className="cv-page">
    <div className="breadcrumbs"><strong>Condomínio</strong><span aria-hidden="true">›</span><strong>Resumo da semana</strong></div>
    <section className="cv-form-section">
      <h1>Resumo da semana</h1>
      <p className="cv-form-hint">Últimos 7 dias, em {todayIso}. Contagens geradas a partir dos registros do condomínio.</p>
    </section>

    <section className="cv-form-section">
      <h2>Ocorrências</h2>
      <div className="cv-stat-grid">
        <article><span>Abertas agora</span><strong>{summary.occurrences.openNow}</strong></article>
        <article><span>Urgentes abertas</span><strong>{summary.occurrences.openUrgent}</strong></article>
        <article><span>Abertas na semana</span><strong>{summary.occurrences.openedLast7Days}</strong></article>
        <article><span>Resolvidas na semana</span><strong>{summary.occurrences.resolvedLast7Days}</strong></article>
      </div>
    </section>

    <section className="cv-form-section">
      <h2>Manutenção</h2>
      <div className="cv-stat-grid">
        <article><span>OS abertas</span><strong>{summary.workOrders.openNow}</strong></article>
        <article><span>OS vencidas</span><strong>{summary.workOrders.overdue}</strong></article>
        <article><span>Solicitações aguardando análise</span><strong>{summary.requests.pendingReview}</strong></article>
        <article><span>Solicitações abertas na semana</span><strong>{summary.requests.openedLast7Days}</strong></article>
      </div>
    </section>

    <section className="cv-form-section">
      <h2>Contratos</h2>
      <div className="cv-stat-grid">
        <article><span>Terminam nos próximos 30 dias</span><strong>{summary.contracts.endingIn30Days}</strong></article>
      </div>
    </section>
  </div>;
}
