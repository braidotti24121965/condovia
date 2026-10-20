import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Suspense } from "react";
import { requireCurrentContext } from "@/lib/auth/context";
import { redirect } from "next/navigation";
import { getDashboardShell, type DashboardPeriod } from "@/lib/dashboard/data";
import { DashboardPeriodFilter } from "@/components/dashboard/dashboard-period-filter";
import { DashboardActivity, DashboardAnalytics, DashboardImports, DashboardKpis, DashboardQuickInfo } from "@/components/dashboard/dashboard-sections";
export const metadata: Metadata = { title: "Painel" };
const periods = new Set<DashboardPeriod>(["today", "7d", "30d"]);
function DashboardSectionSkeleton({ label }: { label: string }) { return <div className="cv-panel loading-page" role="status" aria-label={`Carregando ${label}`}><span className="skeleton skeleton-section-title" /><div className="skeleton skeleton-banner" /><span className="sr-only">Carregando {label}…</span></div>; }

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const context = await requireCurrentContext();
  if (context.type === "platform") redirect("/app/platform");
  if (context.type !== "condominium") return null;
  const requested = (await searchParams).period;
  const period = periods.has(requested as DashboardPeriod) ? requested as DashboardPeriod : "today";
  const shell = await getDashboardShell(context.id);
  if (!shell) return null;
  return <div className="cv-page dashboard-v2"><div className="breadcrumbs"><Link href="/app/dashboard">Início</Link><ChevronRight size={13} /><strong>Painel</strong></div>
       <header className="v2-page-header"><div><p className="page-overline">PAINEL</p><h1>{shell.condo.name}</h1><p><strong>Condomínio</strong> · Visão operacional e atividades recentes.</p></div><DashboardPeriodFilter period={period} /></header>
    <Suspense fallback={<DashboardSectionSkeleton label="indicadores" />}><DashboardKpis shell={shell} condominiumId={context.id} period={period} /></Suspense>
    <div className="v2-main-grid"><main className="v2-main-column">
      <Suspense fallback={<DashboardSectionSkeleton label="atividade recente" />}><DashboardActivity shell={shell} condominiumId={context.id} period={period} /></Suspense>
      <Suspense fallback={<DashboardSectionSkeleton label="gráficos" />}><DashboardAnalytics shell={shell} condominiumId={context.id} period={period} /></Suspense>
      <Suspense fallback={<DashboardSectionSkeleton label="importações" />}><DashboardImports shell={shell} condominiumId={context.id} /></Suspense>
    </main>
       <Suspense fallback={<DashboardSectionSkeleton label="ações rápidas" />}><DashboardQuickInfo shell={shell} /></Suspense>
    </div>
  </div>;
}
