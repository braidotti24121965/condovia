import Link from "next/link";
import { ChevronRight, CheckCircle2, Clock } from "lucide-react";
import { requireCurrentContext, requireUser } from "@/lib/auth/context";
import { EmptyState } from "@/components/ui/feedback";
import { GatehouseNav } from "@/components/gatehouse/gatehouse-nav";
import { ReceivePackageButton } from "@/components/gatehouse/receive-package-button";
import { CollectPackageModal } from "@/components/gatehouse/collect-package-modal";
import { getPackages, getCondoUnits } from "@/lib/gatehouse/data";

export const metadata = { title: "Encomendas — Portaria" };

export default async function GatehousePackagesPage() {
  const { supabase, user } = await requireUser();
  if (!supabase || !user) return null;
  const context = await requireCurrentContext();

  const [packages, units] = await Promise.all([
    getPackages(context.id),
    getCondoUnits(context.id),
  ]);

  const waitingPackages = packages.filter((p) => p.status === "received");
  const collectedPackages = packages.filter((p) => p.status === "collected");

  return (
    <div className="cv-page">
      <div className="breadcrumbs">
        <Link href="/app/dashboard">Início</Link>
        <ChevronRight size={14} />
        <Link href="/app/gatehouse">Portaria</Link>
        <ChevronRight size={14} />
        <strong>Encomendas</strong>
      </div>

      <section className="page-heading">
        <div>
          <p className="page-overline">GESTÃO DE ENCOMENDAS</p>
          <h1>Encomendas — {context.name}</h1>
          <p>Recebimento, guarda e controle de entrega de encomendas e correspondências.</p>
        </div>
        <ReceivePackageButton units={units} />
      </section>

      <GatehouseNav />

      {/* Aguardando Retirada */}
      <section className="cv-panel">
        <div className="cv-panel-heading">
          <h2><Clock size={18} /> Aguardando Retirada ({waitingPackages.length})</h2>
          <p>Encomendas sob custódia na portaria prontas para entrega ao morador.</p>
        </div>

        {waitingPackages.length === 0 ? (
          <EmptyState
            title="Nenhuma encomenda pendente"
            description="Não há encomendas aguardando retirada no momento."
          />
        ) : (
          <div className="cv-table-wrap">
            <table className="cv-table">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Unidade</th>
                  <th>Transportadora</th>
                  <th>Recebida em</th>
                  <th>Observações</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {waitingPackages.map((pkg) => (
                  <tr key={pkg.id}>
                    <td><strong>{pkg.description}</strong></td>
                    <td>Unidade {pkg.unit?.code}</td>
                    <td>{pkg.carrier || "—"}</td>
                    <td>{new Date(pkg.received_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</td>
                    <td>{pkg.notes || "—"}</td>
                    <td>
                      <CollectPackageModal
                        packageId={pkg.id}
                        packageDescription={pkg.description}
                        unitCode={pkg.unit?.code || ""}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Encomendas Retiradas */}
      <section className="cv-panel">
        <div className="cv-panel-heading">
          <h2><CheckCircle2 size={18} /> Encomendas Retiradas Recentemente ({collectedPackages.length})</h2>
          <p>Histórico comprovado de baixas efetuadas.</p>
        </div>

        {collectedPackages.length === 0 ? (
          <p className="cv-muted" style={{ padding: "12px 0", textAlign: "center" }}>
            Nenhum histórico de retirada recente.
          </p>
        ) : (
          <div className="cv-table-wrap">
            <table className="cv-table">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Unidade</th>
                  <th>Transportadora</th>
                  <th>Retirado por</th>
                  <th>Data de retirada</th>
                </tr>
              </thead>
              <tbody>
                {collectedPackages.slice(0, 15).map((pkg) => (
                  <tr key={pkg.id}>
                    <td><strong>{pkg.description}</strong></td>
                    <td>Unidade {pkg.unit?.code}</td>
                    <td>{pkg.carrier || "—"}</td>
                    <td>{pkg.collection?.collector_name || "Morador / Titular"}</td>
                    <td>
                      {pkg.collection?.collected_at
                        ? new Date(pkg.collection.collected_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
                        : "—"}
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
