import { ContentSelect } from "@/components/ui/form-controls";
import Link from "next/link";
import { ClipboardCheck, ChevronRight } from "lucide-react";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { WorkOrderForm } from "@/components/maintenance/work-order-form";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";

const statuses = { open: "Aberta", assigned: "Atribuída", in_progress: "Em execução", awaiting_validation: "Aguardando validação", completed: "Concluída", cancelled: "Cancelada" } as const;
const priorities = { low: "Baixa", medium: "Média", high: "Alta", emergency: "Emergência" } as const;
type MaintenanceAssignee = { user_account_id: string; display_name: string };

export const metadata = { title: "Ordens de serviço" };

export default async function WorkOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; error?: string; saved?: string; occurrence_id?: string }> }) {
  const { supabase, context } = await requireCondominiumPermission("maintenance.orders.read");
  const params = await searchParams;
  const [{ data: orders }, { data: structures }, { data: equipment }, { data: users }, { data: providers }, { data: canCreate }, { data: canFinance }, { data: serviceTypes }, { data: contracts }] = await Promise.all([
    supabase.from("maintenance_work_orders").select("id,work_order_number,description,priority,status,origin,due_at,created_at,condominium_structures(name),user_accounts:responsible_user_account_id(id,people(full_name,preferred_name))").eq("condominium_id", context.id).order("created_at", { ascending: false }).limit(100),
    supabase.from("condominium_structures").select("id,name").eq("condominium_id", context.id).eq("status", "active").order("name"),
    supabase.from("maintenance_equipment").select("id,identification,structure_id").eq("condominium_id", context.id).eq("status", "active").order("identification"),
    supabase.rpc("list_maintenance_work_order_assignees", { p_condominium_id: context.id }),
    supabase.from("service_providers").select("id,full_name,company_name").eq("condominium_id", context.id).eq("status", "active").order("full_name"),
    supabase.rpc("has_permission", { permission_code: "maintenance.orders.create", target_condominium_id: context.id }),
    supabase.rpc("has_permission", { permission_code: "maintenance.finance.manage", target_condominium_id: context.id }),
    supabase.from("maintenance_service_types").select("id,name").eq("condominium_id", context.id).eq("status", "active"),
    supabase.from("maintenance_contracts").select("id,title").eq("condominium_id", context.id).eq("status", "active"),
  ]);
  const visible = (orders ?? []).filter((item) => !params.status || item.status === params.status);
  const userOptions = (users as MaintenanceAssignee[] ?? []).map((item) => ({ id: item.user_account_id, name: item.display_name }));
  const providerOptions = (providers ?? []).map((item) => ({ id: item.id, name: [item.full_name, item.company_name].filter(Boolean).join(" · ") }));
  return <div className="cv-page"><div className="breadcrumbs"><Link href="/app/condominium/maintenance">Manutenção</Link><ChevronRight size={14}/><strong>Ordens de serviço</strong></div>
    <section className="page-heading"><div><p className="page-overline">P8.3 · OPERAÇÃO</p><h1>Ordens de serviço</h1><p>Controle a execução e a validação técnica da manutenção das áreas comuns.</p></div></section>
    {params.error && <Alert tone="error">{params.error}</Alert>}{params.saved && <Alert tone="success">Ordem de serviço criada.</Alert>}
    {canCreate === true && <section className="cv-panel"><div className="cv-panel-heading"><div><h2><ClipboardCheck size={18}/> Nova ordem de serviço</h2><p>Abertura direta para uma área comum. Solicitações aprovadas podem originar uma OS pelo detalhe.</p></div></div><WorkOrderForm structures={structures ?? []} equipment={equipment ?? []} users={userOptions} providers={providerOptions} serviceTypes={serviceTypes ?? []} contracts={(contracts ?? []).map(c => ({ id: c.id, name: c.title }))} canFinance={canFinance === true} occurrenceId={params.occurrence_id}/></section>}
    <section className="cv-panel"><div className="cv-panel-heading"><div><h2><ClipboardCheck size={18}/> Ordens registradas</h2><p>{visible.length} ordem(ns) exibida(s).</p></div></div><form className="cv-filters" method="get"><label>Status<ContentSelect name="status" defaultValue={params.status ?? ""}><option value="">Todos</option>{Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</ContentSelect></label><Button type="submit">Filtrar</Button></form>{visible.length === 0 ? <EmptyState title="Nenhuma ordem de serviço encontrada" description="As ordens criadas para as áreas comuns aparecerão aqui."/> : <div className="cv-table-wrap"><table className="cv-table"><thead><tr><th>OS</th><th>Descrição</th><th>Prioridade</th><th>Status</th><th>Prazo</th><th>Ação</th></tr></thead><tbody>{visible.map((item) => { const structure = item.condominium_structures as unknown as { name?: string } | null; return <tr key={item.id}><td><Link href={`/app/condominium/maintenance/work-orders/${item.id}`}><strong>OS #{item.work_order_number}</strong></Link><br/><span className="cv-muted">{structure?.name ?? "Área comum"}</span></td><td>{item.description}</td><td><StatusBadge variant={item.priority === "emergency" ? "danger" : item.priority === "high" ? "warning" : "neutral"}>{priorities[item.priority as keyof typeof priorities] ?? item.priority}</StatusBadge></td><td><StatusBadge variant={item.status === "completed" ? "success" : item.status === "cancelled" ? "danger" : item.status === "awaiting_validation" ? "warning" : "neutral"}>{statuses[item.status as keyof typeof statuses] ?? item.status}</StatusBadge></td><td>{item.due_at ? new Date(`${item.due_at}T00:00:00Z`).toLocaleDateString("pt-BR") : "—"}</td><td><Link className="button button-secondary button-compact" href={`/app/condominium/maintenance/work-orders/${item.id}`}>Abrir</Link></td></tr>;})}</tbody></table></div>}</section>
  </div>;
}
