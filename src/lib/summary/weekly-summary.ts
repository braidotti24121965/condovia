/**
 * Resumo semanal do condomínio para o síndico. Função pura: recebe as linhas já lidas do banco
 * e devolve as contagens. Não usa IA: são somas e comparações de datas.
 */

const OCCURRENCE_OPEN = ["open", "triage", "in_progress"];
const WORK_ORDER_OPEN = ["open", "assigned", "in_progress", "awaiting_validation"];

export type OccurrenceRow = {
  status: string;
  priority: string;
  created_at: string;
  resolved_at: string | null;
  category_id: string;
};
export type WorkOrderRow = { status: string; due_at: string | null };
export type RequestRow = { status: string; opened_at: string };
export type ContractRow = { status: string; ends_on: string };

export type WeeklySummaryInput = {
  /** Instante de referência, normalmente agora. */
  now: Date;
  /** Data civil de hoje no fuso do condomínio, aaaa-mm-dd. */
  todayIso: string;
  occurrences: OccurrenceRow[];
  /** Nome de cada categoria, pelo id. */
  categoryNames: Record<string, string>;
  workOrders: WorkOrderRow[];
  requests: RequestRow[];
  contracts: ContractRow[];
};

export type CategoryBreakdown = { categoryId: string; name: string; openNow: number; openedLast7Days: number };

export type WeeklySummary = {
  occurrences: { openNow: number; openUrgent: number; openedLast7Days: number; resolvedLast7Days: number };
  /** Ordenado pelas ocorrências abertas na semana, da maior para a menor. */
  occurrencesByCategory: CategoryBreakdown[];
  workOrders: { openNow: number; overdue: number };
  requests: { pendingReview: number; openedLast7Days: number };
  contracts: { endingIn30Days: number };
};

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function buildWeeklySummary(input: WeeklySummaryInput): WeeklySummary {
  const weekStart = input.now.getTime() - 7 * DAY_MS;
  const inWeek = (iso: string | null) => iso !== null && Date.parse(iso) >= weekStart && Date.parse(iso) <= input.now.getTime();
  const in30 = addDays(input.todayIso, 30);

  const openOccurrences = input.occurrences.filter((o) => OCCURRENCE_OPEN.includes(o.status));
  const openWorkOrders = input.workOrders.filter((w) => WORK_ORDER_OPEN.includes(w.status));

  const categoryIds = [...new Set(input.occurrences.map((o) => o.category_id))];
  const occurrencesByCategory = categoryIds
    .map((categoryId) => {
      const rows = input.occurrences.filter((o) => o.category_id === categoryId);
      return {
        categoryId,
        name: input.categoryNames[categoryId] ?? "Sem nome",
        openNow: rows.filter((o) => OCCURRENCE_OPEN.includes(o.status)).length,
        openedLast7Days: rows.filter((o) => inWeek(o.created_at)).length,
      };
    })
    .sort((a, b) => b.openedLast7Days - a.openedLast7Days || a.name.localeCompare(b.name, "pt-BR"));

  return {
    occurrencesByCategory,
    occurrences: {
      openNow: openOccurrences.length,
      openUrgent: openOccurrences.filter((o) => o.priority === "urgent").length,
      openedLast7Days: input.occurrences.filter((o) => inWeek(o.created_at)).length,
      resolvedLast7Days: input.occurrences.filter((o) => inWeek(o.resolved_at)).length,
    },
    workOrders: {
      openNow: openWorkOrders.length,
      overdue: openWorkOrders.filter((w) => w.due_at !== null && w.due_at < input.todayIso).length,
    },
    requests: {
      pendingReview: input.requests.filter((r) => r.status === "pending_review").length,
      openedLast7Days: input.requests.filter((r) => inWeek(r.opened_at)).length,
    },
    contracts: {
      endingIn30Days: input.contracts.filter((c) => c.status === "active" && c.ends_on >= input.todayIso && c.ends_on <= in30).length,
    },
  };
}
