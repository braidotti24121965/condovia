"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
const root = "/app/condominium/maintenance";
export function MaintenanceNav() {
  const pathname = usePathname();
  return <nav className="cv-maintenance-nav" aria-label="Manutenção">
    {[["", "Equipamentos"], ["/requests", "Solicitações"], ["/work-orders", "Ordens de serviço"], ["/providers", "Fornecedores"], ["/contracts", "Contratos"], ["/documents", "Documentos"], ["/plans", "Preventivas"], ["/finance", "Custos e aprovações"], ["/governance", "Alçadas e requisitos"]].map(([path, name]) => { const active = path === "" ? pathname === root || pathname.startsWith(`${root}/equipment/`) : pathname === `${root}${path}` || pathname.startsWith(`${root}${path}/`); return <Link className="button button-compact cv-maintenance-tab" aria-current={active ? "page" : undefined} key={path} href={`${root}${path}`}>{name}</Link>; })}
  </nav>;
}
