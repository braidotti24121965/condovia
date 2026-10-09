import Link from "next/link";
import { AlertTriangle, ChevronRight, ClipboardList } from "lucide-react";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { MaintenanceRequestForm } from "@/components/maintenance/request-form";
import { Button } from "@/components/ui/button";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { StatusBadge } from "@/components/ui/status-badge";
import { decideMaintenanceRequestAction } from "@/lib/maintenance/actions";

const statusLabels = { pending_review: "Aguardando análise", approved: "Aprovada", rejected: "Rejeitada" } as const;
const priorityLabels = { low: "Baixa", medium: "Média", high: "Alta", emergency: "Emergência" } as const;

export const metadata = { title: "Solicitações de manutenção" };

export default async function MaintenanceRequestsPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string; updated?: string; status?: string; priority?: string }> }) {
  const { supabase, context } = await requireCondominiumPermission("maintenance.requests.read");
  const params = await searchParams;
  const [{ data: requests }, { data: structures }, { data: equipment }, { data: canCreate }, { data: canDecide }] = await Promise.all([
    supabase.from("maintenance_requests").select("id,request_number,title,description,priority,status,opened_at,requester_person_id,structure_id,equipment_id,rejection_reason,condominium_structures(name),maintenance_equipment(identification)").eq("condominium_id", context.id).order("created_at", { ascending: false }).limit(100),
    supabase.from("condominium_structures").select("id,name").eq("condominium_id", context.id).eq("status", "active").order("name"),
    supabase.from("maintenance_equipment").select("id,identification,structure_id").eq("condominium_id", context.id).eq("status", "active").order("identification"),
    supabase.rpc("has_permission", { permission_code: "maintenance.requests.create", target_condominium_id: context.id }),
    supabase.rpc("has_permission", { permission_code: "maintenance.requests.decide", target_condominium_id: context.id }),
  ]);
  const visibleRequests = (requests ?? []).filter((item) => (!params.status || item.status === params.status) && (!params.priority || item.priority === params.priority));
  return <div className="cv-page"><div className="breadcrumbs"><Link href="/app/condominium/maintenance">Manutenção</Link><ChevronRight size={14}/><strong>Solicitações</strong></div>
    <section className="page-heading"><div><p className="page-overline">P8.2 · SOLICITAÇÕES</p><h1>Solicitações de manutenção</h1><p>Registros de problemas nas áreas comuns de {context.name}.</p></div></section>
    {params.error && <Alert tone="error">{params.error}</Alert>}{(params.saved || params.updated) && <Alert tone="success">Alterações salvas.</Alert>}
    {canCreate === true && <section className="cv-panel"><div className="cv-panel-heading"><div><h2><ClipboardList size={18}/> Nova solicitação</h2><p>Registre somente problemas relacionados às áreas comuns.</p></div></div><MaintenanceRequestForm structures={structures ?? []} equipment={equipment ?? []}/></section>}
    <section className="cv-panel"><div className="cv-panel-heading"><div><h2><ClipboardList size={18}/> Solicitações registradas</h2><p>{visibleRequests.length} solicitação(ões) exibida(s).</p></div></div><form className="cv-filters" method="get"><label>Status<select name="status" defaultValue={params.status ?? ""}><option value="">Todos</option>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>Prioridade<select name="priority" defaultValue={params.priority ?? ""}><option value="">Todas</option>{Object.entries(priorityLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><Button type="submit">Filtrar</Button></form>{visibleRequests.length === 0 ? <EmptyState title="Nenhuma solicitação encontrada" description="As solicitações das áreas comuns aparecerão aqui."/> : <div className="cv-table-wrap"><table className="cv-table"><thead><tr><th>Solicitação</th><th>Área comum</th><th>Prioridade</th><th>Status</th><th>Abertura</th><th>Ação</th></tr></thead><tbody>{visibleRequests.map((item) => <tr key={item.id}><td><Link href={`/app/condominium/maintenance/requests/${item.id}`}><strong>#{item.request_number} · {item.title}</strong></Link>{item.priority === "emergency" && <span className="cv-muted"><AlertTriangle size={13}/> Urgente</span>}</td><td>{(item.condominium_structures as { name?: string } | null)?.name ?? "—"}</td><td><StatusBadge variant={item.priority === "emergency" ? "danger" : item.priority === "high" ? "warning" : "neutral"}>{priorityLabels[item.priority as keyof typeof priorityLabels] ?? item.priority}</StatusBadge></td><td><StatusBadge variant={item.status === "approved" ? "success" : item.status === "rejected" ? "danger" : "warning"}>{statusLabels[item.status as keyof typeof statusLabels] ?? item.status}</StatusBadge></td><td><time dateTime={item.opened_at}>{new Date(item.opened_at).toLocaleDateString("pt-BR")}</time></td><td>{canDecide === true && item.status === "pending_review" && <div className="cv-import-actions"><form action={decideMaintenanceRequestAction}><input type="hidden" name="request_id" value={item.id}/><input type="hidden" name="decision" value="approve"/><Button size="compact" type="submit">Aprovar</Button></form><Link className="button button-secondary button-small" href={`/app/condominium/maintenance/requests/${item.id}?decide=reject`}>Rejeitar</Link></div>}</td></tr>)}</tbody></table></div>}</section>
  </div>;
}
