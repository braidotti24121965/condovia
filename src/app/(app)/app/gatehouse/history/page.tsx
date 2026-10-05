import Link from "next/link";
import { ChevronRight, History, LogIn, LogOut } from "lucide-react";
import { requireCurrentContext, requireUser } from "@/lib/auth/context";
import { EmptyState } from "@/components/ui/feedback";
import { GatehouseNav } from "@/components/gatehouse/gatehouse-nav";
import { getAccessEvents } from "@/lib/gatehouse/data";
import { formatEventDateTimeInTimezone } from "@/lib/gatehouse/timezone";
import { ProviderDisplay } from "@/components/gatehouse/provider-display";

export const metadata = { title: "Histórico de Acesso — Portaria" };

export default async function GatehouseHistoryPage() {
  const { supabase, user } = await requireUser();
  if (!supabase || !user) return null;
  const context = await requireCurrentContext();

  const events = await getAccessEvents(context.id, 100);
  const { data: condo } = await supabase.from("condominiums").select("timezone").eq("id", context.id).maybeSingle();
  const timeZone = condo?.timezone || "America/Sao_Paulo";

  return (
    <div className="cv-page">
      <div className="breadcrumbs">
        <Link href="/app/dashboard">Início</Link>
        <ChevronRight size={14} />
        <Link href="/app/gatehouse">Portaria</Link>
        <ChevronRight size={14} />
        <strong>Histórico de Acesso</strong>
      </div>

      <section className="page-heading">
        <div>
          <p className="page-overline">REGISTRO HISTÓRICO FACTUAL</p>
          <h1>Histórico de Entradas e Saídas</h1>
          <p>Registros imutáveis de controle de acesso da portaria com carimbo de data/hora.</p>
        </div>
      </section>

      <GatehouseNav />

      <section className="cv-panel">
        <div className="cv-panel-heading">
          <h2><History size={18} /> Eventos de Portaria ({events.length})</h2>
          <p>Ordenados cronologicamente do mais recente ao mais antigo.</p>
        </div>

        {events.length === 0 ? (
          <EmptyState
            title="Nenhum evento registrado"
            description="Os registros de entradas e saídas de visitantes e prestadores serão exibidos aqui."
          />
        ) : (
          <div className="cv-table-wrap">
            <table className="cv-table">
              <thead>
                <tr>
                  <th>Data e Hora</th>
                  <th>Evento</th>
                  <th>Pessoa</th>
                  <th>Destino</th>
                  <th>Ponto de acesso</th>
                  <th>Observações</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => {
                  const name = e.visitor?.full_name || e.service_provider?.full_name || "—";
                  const isEntry = e.event_type === "entry";
                  return (
                    <tr key={e.id}>
                      <td>
                        <strong>{formatEventDateTimeInTimezone(e.occurred_at, timeZone)}</strong>
                      </td>
                      <td>
                        <span className={`cv-status ${isEntry ? "cv-badge-entry" : "cv-badge-exit"}`}>
                          {isEntry ? <><LogIn size={13} style={{ marginRight: "4px" }} /> Entrada</> : <><LogOut size={13} style={{ marginRight: "4px" }} /> Saída</>}
                        </span>
                      </td>
                      <td>
                        {e.service_provider ? <ProviderDisplay name={name} company={e.service_provider.company_name} /> : <strong>{name}</strong>}
                      </td>
                      <td>Unidade {e.unit?.code}</td>
                      <td>{e.access_point?.name || "Portaria"}</td>
                      <td>{e.notes || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
