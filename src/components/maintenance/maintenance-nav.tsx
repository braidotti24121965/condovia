import Link from "next/link";
const root = "/app/condominium/maintenance";
export function MaintenanceNav() {
  return <nav className="cv-maintenance-nav" aria-label="Manutenção">
    {[["", "Equipamentos"], ["/requests", "Solicitações"], ["/work-orders", "Ordens de serviço"], ["/providers", "Fornecedores"], ["/contracts", "Contratos"], ["/documents", "Documentos"], ["/plans", "Preventivas"], ["/finance", "Custos e aprovações"], ["/governance", "Alçadas e requisitos"]].map(([path, name]) => <Link className="button button-secondary button-compact" key={path} href={`${root}${path}`}>{name}</Link>)}
  </nav>;
}
