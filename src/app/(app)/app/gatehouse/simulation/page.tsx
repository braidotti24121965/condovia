import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { isAccessSimulationEnabled } from "@/lib/gatehouse/simulation";
import { GatehouseNav } from "@/components/gatehouse/gatehouse-nav";
import { SimulationDeviceForm, SimulationForm } from "@/components/gatehouse/simulation-form";
import { SimulationHistory } from "@/components/gatehouse/simulation-history";

export const metadata = { title: "Simulação de eventos — Portaria" };
function relation<T>(value: T | T[] | null): T | undefined { return Array.isArray(value) ? value[0] : value ?? undefined; }
const statusLabels: Record<string, string> = { approved: "Aprovada", pending: "Pendente", revoked: "Revogada", expired: "Expirada", cancelled: "Cancelada", denied: "Negada" };

export default async function SimulationPage() {
  if (!isAccessSimulationEnabled()) notFound();
  const { supabase, context } = await requireCondominiumPermission("structures.manage");
  const [devices, permits, ledger, condo, points] = await Promise.all([
    supabase.from("access_devices").select("id, manufacturer, model, access_point:access_points(name)").eq("condominium_id", context.id).eq("status", "active"),
    supabase.from("access_authorizations").select("id, status, visitor:visitors(full_name), provider:service_providers(full_name), unit:units(code)").eq("condominium_id", context.id).order("created_at", { ascending: false }).limit(200),
    supabase.from("access_simulations").select("id, external_event_id, event_type, occurred_at, outcome, out_of_order").eq("condominium_id", context.id).order("created_at", { ascending: false }).limit(50),
    supabase.from("condominiums").select("timezone").eq("id", context.id).single(),
    supabase.from("access_points").select("id, name").eq("condominium_id", context.id).eq("status", "active"),
  ]);
  const ready = !devices.error && !permits.error && !ledger.error;
  const deviceOptions = (devices.data ?? []).map(d => ({ id: d.id, label: `${d.manufacturer} ${d.model} — ${relation(d.access_point)?.name ?? d.id.slice(0,8)}` }));
  const permitOptions = (permits.data ?? []).map(a => ({ id: a.id, label: `${relation(a.visitor)?.full_name ?? relation(a.provider)?.full_name ?? a.id.slice(0,8)} — ${relation(a.unit)?.code ?? "Unidade"} (${statusLabels[a.status] ?? a.status})` }));
  return <div className="cv-page gatehouse-v2">
    <section className="v2-page-header"><div><p className="page-overline">HOMOLOGAÇÃO</p><h1>Simulação de eventos</h1><p>Registra acessos de teste sem chamar equipamentos reais. Entradas e saídas afetam a presença neste ambiente.</p></div></section>
    <GatehouseNav showSimulation />
    <section className="cv-panel"><h2>Equipamento simulado</h2><p>Cadastre um simulador em um ponto ativo. Nenhuma credencial ou conexão com aparelho é usada.</p><SimulationDeviceForm points={(points.data ?? []).map(p => ({ id: p.id, label: p.name }))} /></section>
    <section className="cv-panel"><h2>Novo evento simulado</h2><p>São listadas as 200 autorizações mais recentes do condomínio.</p>
      {!ready ? <p role="alert">A simulação ainda não está disponível neste ambiente. Solicite a habilitação ao responsável pelo sistema.</p> : <>
        {(!deviceOptions.length || !permitOptions.length) && <p role="status">É necessário um equipamento ativo cadastrado e uma autorização de visitante ou prestador neste condomínio.</p>}
        <SimulationForm devices={deviceOptions} authorizations={permitOptions} />
      </>}
    </section>
    <section className="cv-panel"><h2>Últimas simulações</h2><p>Negações ficam neste histórico e não alteram a presença. <Link href="/app/gatehouse/history">Conferir histórico de acessos</Link></p>
      <SimulationHistory events={ledger.data ?? []} timeZone={condo.data?.timezone || "America/Sao_Paulo"} />
      {ready && !ledger.data?.length && <p>Nenhuma simulação registrada.</p>}
    </section>
  </div>;
}
