import Link from "next/link";
import { ChevronRight, Users, Clock, FileQuestion, Package as PackageIcon } from "lucide-react";
import { requireCurrentContext, requireUser } from "@/lib/auth/context";
import { EmptyState } from "@/components/ui/feedback";
import { GatehouseNav } from "@/components/gatehouse/gatehouse-nav";
import { QuickActions } from "@/components/gatehouse/quick-actions";
import { formatAuthorizationWindowInTimezone } from "@/lib/gatehouse/timezone";
import { formatTimeInTimezone } from "@/lib/gatehouse/timezone";
import { formatDateTimeInTimezone } from "@/lib/gatehouse/timezone";
import {
  getGatehouseDashboardSummary,
  getAccessPoints,
  getCondoUnits,
  getVisitors,
  getServiceProviders,
} from "@/lib/gatehouse/data";

export const metadata = { title: "Portaria — Painel Operacional" };

export default async function GatehouseDashboardPage() {
  const { supabase, user } = await requireUser();
  if (!supabase || !user) return null;
  const context = await requireCurrentContext();

  if (context.type !== "condominium") {
    return (
      <div className="cv-page">
        <h1>Portaria</h1>
        <EmptyState
          title="Selecione um condomínio"
          description="Acesse o contexto de um condomínio para operar a portaria."
        />
      </div>
    );
  }

  // Check permission
  const { data: canRead } = await supabase.rpc("has_permission", {
    permission_code: "gatehouse.read",
    target_condominium_id: context.id,
  });

  if (!canRead) {
    return (
      <div className="cv-page">
        <h1>Portaria</h1>
        <EmptyState
          title="Acesso negado"
          description="Sua função atual não possui permissão para consultar o módulo de Portaria."
        />
      </div>
    );
  }

  const [summary, accessPoints, units, visitors, providers, { data: condo }] = await Promise.all([
    getGatehouseDashboardSummary(context.id),
    getAccessPoints(context.id),
    getCondoUnits(context.id),
    getVisitors(context.id),
    getServiceProviders(context.id),
    supabase.from("condominiums").select("timezone").eq("id", context.id).maybeSingle(),
  ]);
  const timeZone = condo?.timezone || "America/Sao_Paulo";

  return (
    <div className="cv-page">
      <div className="breadcrumbs">
        <Link href="/app/dashboard">Início</Link>
        <ChevronRight size={14} />
        <strong>Portaria</strong>
      </div>

      <section className="page-heading">
        <div>
          <p className="page-overline">OPERAÇÃO DE CONTROLE DE ACESSO</p>
          <h1>Portaria — {context.name}</h1>
          <p>Visão em tempo real de presença, chegadas esperadas, autorizações e encomendas.</p>
        </div>
      </section>

      <GatehouseNav />

      {/* KPI Stats Grid */}
      <section className="cv-stat-grid" aria-label="Indicadores operacionais">
        <article>
          <span>Dentro agora</span>
          <strong>{summary.insideNowCount}</strong>
          <small className="cv-muted">Pessoas no condomínio</small>
        </article>
        <article>
          <span>Autorizações hoje</span>
          <strong>{summary.authorizationsTodayCount}</strong>
          <small className="cv-muted">Válidas para a data de hoje</small>
        </article>
        <article>
          <span>Aguardando autorização</span>
          <strong>{summary.pendingRequestsCount}</strong>
          <small className="cv-muted">Solicitações de moradores pendentes</small>
        </article>
        <article>
          <span>Encomendas na portaria</span>
          <strong>{summary.waitingPackagesCount}</strong>
          <small className="cv-muted">Aguardando retirada pelos moradores</small>
        </article>
      </section>

      {/* Quick Actions Bar */}
      <QuickActions
        authorizations={summary.expectedArrivals}
        accessPoints={accessPoints}
        presenceList={summary.presenceList}
        units={units}
        visitors={visitors}
        providers={providers}
        timeZone={timeZone}
      />

      {/* 2x2 Grid with Operational Panels */}
      <div className="cv-dashboard-split">
        {/* Pessoas dentro agora */}
        <section className="cv-panel">
          <div className="cv-panel-heading">
            <h2><Users size={18} /> Pessoas dentro agora ({summary.presenceList.length})</h2>
            <Link href="/app/gatehouse/access" className="text-button">Ver todos →</Link>
          </div>
          {summary.presenceList.length === 0 ? (
            <p className="cv-muted" style={{ padding: "16px 0", textAlign: "center" }}>
              Nenhum visitante ou prestador registrado no momento.
            </p>
          ) : (
            <div className="cv-table-wrap">
              <table className="cv-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Tipo</th>
                    <th>Destino</th>
                    <th>Ponto</th>
                    <th>Entrada</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.presenceList.slice(0, 5).map((p) => (
                  <tr key={p.target_id}>
                      <td>
                        <strong>{p.full_name}</strong>
                        {p.company_name && <small className="cv-muted">{p.company_name}</small>}
                      </td>
                      <td>
                        <span className="cv-status">
                          {p.target_kind === "visitor" ? "Visitante" : "Prestador"}
                        </span>
                      </td>
                      <td>Unidade {p.unit_code}</td>
                      <td>{p.access_point_name}</td>
                      <td>{formatTimeInTimezone(p.entered_at, timeZone)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Chegadas esperadas hoje */}
        <section className="cv-panel">
          <div className="cv-panel-heading">
            <h2><Clock size={18} /> Chegadas esperadas ({summary.expectedArrivals.length})</h2>
            <Link href="/app/gatehouse/authorizations" className="text-button">Ver todas →</Link>
          </div>
          {summary.expectedArrivals.length === 0 ? (
            <p className="cv-muted" style={{ padding: "16px 0", textAlign: "center" }}>
              Nenhuma nova autorização aguardando entrada para hoje.
            </p>
          ) : (
            <div className="cv-table-wrap">
              <table className="cv-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Destino</th>
                    <th>Janela</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.expectedArrivals.slice(0, 5).map((a) => (
                    <tr key={a.id}>
                      <td>
                        <strong>{a.visitor?.full_name || a.service_provider?.full_name}</strong>
                        {a.service_provider?.company_name && (
                          <small className="cv-muted">{a.service_provider.company_name}</small>
                        )}
                      </td>
                      <td>Unidade {a.unit?.code}</td>
                      <td>
                        {formatAuthorizationWindowInTimezone(a.valid_from, a.valid_until, timeZone)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Solicitações pendentes */}
        <section className="cv-panel">
          <div className="cv-panel-heading">
            <h2><FileQuestion size={18} /> Solicitações pendentes ({summary.pendingRequests.length})</h2>
            <Link href="/app/gatehouse/authorizations" className="text-button">Gerenciar →</Link>
          </div>
          {summary.pendingRequests.length === 0 ? (
            <p className="cv-muted" style={{ padding: "16px 0", textAlign: "center" }}>
              Nenhuma solicitação de acesso pendente de autorização.
            </p>
          ) : (
            <div className="cv-table-wrap">
              <table className="cv-table">
                <thead>
                  <tr>
                    <th>Visitante</th>
                    <th>Unidade</th>
                    <th>Solicitado em</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.pendingRequests.slice(0, 5).map((r) => (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.visitor?.full_name || r.service_provider?.full_name}</strong>
                      </td>
                      <td>Unidade {r.unit?.code}</td>
                      <td>{formatTimeInTimezone(r.requested_at, timeZone)}</td>
                      <td><span className="cv-status cv-status-under_construction">Pendente</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Encomendas recentes */}
        <section className="cv-panel">
          <div className="cv-panel-heading">
            <h2><PackageIcon size={18} /> Encomendas na portaria ({summary.recentPackages.length})</h2>
            <Link href="/app/gatehouse/packages" className="text-button">Ver todas →</Link>
          </div>
          {summary.recentPackages.length === 0 ? (
            <p className="cv-muted" style={{ padding: "16px 0", textAlign: "center" }}>
              Nenhuma encomenda aguardando retirada.
            </p>
          ) : (
            <div className="cv-table-wrap">
              <table className="cv-table">
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>Unidade</th>
                    <th>Transportadora</th>
                    <th>Recebida em</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.recentPackages.slice(0, 5).map((pkg) => (
                    <tr key={pkg.id}>
                      <td><strong>{pkg.description}</strong></td>
                      <td>Unidade {pkg.unit?.code}</td>
                      <td>{pkg.carrier || "—"}</td>
                      <td>{formatTimeInTimezone(pkg.received_at, timeZone)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
