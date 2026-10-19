import Link from "next/link";

export type FinancePeriod = "today" | "7d" | "30d" | "60d" | "90d";

const periods = [["today", "Hoje"], ["7d", "7 dias"], ["30d", "30 dias"], ["60d", "60 dias"], ["90d", "90 dias"]] as const;

export function FinancePeriodFilter({ period, view }: { period: FinancePeriod; view: string }) {
  return <nav className="dashboard-period-filter" aria-label="Período financeiro">{periods.map(([value, label]) => <Link key={value} href={`/app/condominium/finance?view=${view}&period=${value}`} aria-current={period === value ? "page" : undefined} className={period === value ? "active" : ""}>{label}</Link>)}</nav>;
}
