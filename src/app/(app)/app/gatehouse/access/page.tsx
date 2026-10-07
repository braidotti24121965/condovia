import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { requireCurrentContext, requireUser } from "@/lib/auth/context";
import { EmptyState } from "@/components/ui/feedback";
import { GatehouseNav } from "@/components/gatehouse/gatehouse-nav";
import { QuickExitButton } from "@/components/gatehouse/quick-exit-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatTimeInTimezone } from "@/lib/gatehouse/timezone";
import {
  getGatehousePresence,
  getAccessPoints,
} from "@/lib/gatehouse/data";

export const metadata = { title: "Presença e Acesso — Portaria" };

export default async function AccessPresencePage() {
  const { supabase, user } = await requireUser();
  if (!supabase || !user) return null;
  const context = await requireCurrentContext();

  const [presenceList, accessPoints, { data: condo }] = await Promise.all([
    getGatehousePresence(context.id),
    getAccessPoints(context.id),
    supabase.from("condominiums").select("timezone").eq("id", context.id).maybeSingle(),
  ]);

  const defaultAccessPointId = accessPoints[0]?.id || "";
  const timeZone = condo?.timezone || "America/Sao_Paulo";

  return (
    <div className="cv-page gatehouse-v2">
      <div className="breadcrumbs">
        <Link href="/app/dashboard">Início</Link>
        <ChevronRight size={14} />
        <Link href="/app/gatehouse">Portaria</Link>
        <ChevronRight size={14} />
        <strong>Presença e Controle de Acesso</strong>
      </div>

      <section className="v2-page-header">
        <div>
          <p className="page-overline">STATUS EM TEMPO REAL</p>
          <h1>Dentro Agora — {context.name}</h1>
          <p>Relação de visitantes e prestadores atualmente dentro das dependências do condomínio.</p>
        </div>
        <div className="heading-status">
          <span className="status-dot" />
          <span>{presenceList.length} pessoas dentro</span>
        </div>
      </section>

      <GatehouseNav />

      <section className="cv-panel v2-panel gatehouse-list-panel">
        <div className="cv-panel-heading">
          <h2><Users size={18} /> Pessoas Dentro do Condomínio ({presenceList.length})</h2>
          <p>Derivado factualmente dos eventos de entrada sem saída correspondente.</p>
        </div>

        {presenceList.length === 0 ? (
          <EmptyState
            title="Nenhum visitante ou prestador dentro agora"
            description="Quando uma entrada for registrada na portaria, o registro ativo aparecerá aqui com opção de baixa de saída imediata."
          />
        ) : (
          <div className="cv-table-wrap">
            <table className="cv-table">
              <thead>
                <tr>
                  <th>Nome completo</th>
                  <th>Tipo</th>
                  <th>Documento</th>
                  <th>Destino</th>
                  <th>Ponto de entrada</th>
                  <th>Hora de entrada</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {presenceList.map((p) => (
                  <tr key={p.target_id}>
                    <td>
                      <strong>{p.full_name}</strong>
                      {p.company_name && <small className="cv-muted">{p.company_name}</small>}
                    </td>
                    <td>
                      <StatusBadge variant="info">
                        {p.target_kind === "visitor" ? "Visitante" : "Prestador"}
                      </StatusBadge>
                    </td>
                    <td>{p.document_number ? `${p.document_type?.toUpperCase() || "DOC"}: ${p.document_number}` : "—"}</td>
                    <td>Unidade {p.unit_code}</td>
                    <td>{p.access_point_name}</td>
                    <td>{formatTimeInTimezone(p.entered_at, timeZone)}</td>
                    <td>
                      <QuickExitButton
                        targetKind={p.target_kind}
                        targetId={p.target_id}
                        accessPointId={p.access_point_id || defaultAccessPointId}
                        targetName={p.full_name}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
