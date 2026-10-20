"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const items = [
  ["?view=overview", "Visão geral"],
  ["?view=payables", "Contas a pagar"],
  ["?view=receivables", "Contas a receber"],
  ["?view=cash-flow", "Fluxo de caixa"],
  ["?view=bills", "Boletos"],
] as const;

export function FinanceNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeQuery = searchParams.get("view") ? `?view=${searchParams.get("view")}` : "?view=overview";
  return <nav className="cv-maintenance-nav" aria-label="Financeiro">
    {items.map(([query, label]) => <Link className="button cv-maintenance-tab" key={query} href={`/app/condominium/finance${query}`} aria-current={pathname === "/app/condominium/finance" && activeQuery === query ? "page" : undefined}>{label}</Link>)}
  </nav>;
}
