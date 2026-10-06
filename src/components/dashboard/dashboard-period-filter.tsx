import Link from "next/link";
import type { DashboardPeriod } from "@/lib/dashboard/data";
export function DashboardPeriodFilter({ period }: { period: DashboardPeriod }) {
  return <nav className="dashboard-period-filter" aria-label="Período do painel">{([["today", "Hoje"], ["7d", "7 dias"], ["30d", "30 dias"]] as const).map(([value, label]) => <Link key={value} href={"/app/dashboard?period=" + value} aria-current={period === value ? "page" : undefined} className={period === value ? "active" : ""}>{label}</Link>)}</nav>;
}
