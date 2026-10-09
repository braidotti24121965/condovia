import Link from "next/link";
import { ChevronRight, ClipboardList } from "lucide-react";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { Button } from "@/components/ui/button";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { StatusBadge } from "@/components/ui/status-badge";
import { createMaintenanceWorkOrderAction, decideMaintenanceRequestAction } from "@/lib/maintenance/actions";

const statusLabels = { pending_review: "Aguardando análise", approved: "Aprovada", rejected: "Rejeitada" } as const;
const priorityLabels = { low: "Baixa", medium: "Média", high: "Alta", emergency: "Emergência" } as const;

export default async function MaintenanceRequestDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ decide?: string; error?: string }> }) {
  const { supabase, context } = await requireCondominiumPermission("maintenance.requests.read");
  const { id } = await params;
  const query = await searchParams;
  const [{ data: request }, { data: history }, { data: canDecide }, { data: canCreateOrder }] = await Promise.all([
    supabase.from("maintenance_requests").select("*,condominium_structures(name),maintenance_equipment(identification)").eq("id", id).eq("condominium_id", context.id).maybeSingle(),
    supabase.from("maintenance_request_history").select("id,event_type,previous_status,new_status,reason,created_at").eq("request_id", id).eq("condominium_id", context.id).order("created_at"),
    supabase.rpc("has_permission", { permission_code: "maintenance.requests.decide", target_condominium_id: context.id }),
    supabase.rpc("has_permission", { permission_code: "maintenance.orders.create", target_condominium_id: context.id }),
  ]);
  if (!request) return <div className="cv-page"><EmptyState title="Solicitação não encontrada" description="A solicitação pode ter sido removida ou não pertence a este condomínio."/></div>;
  return <div className="cv-page"><div className="breadcrumbs"><Link href="/app/condominium/maintenance/requests">Solicitações</Link><ChevronRight size={14}/><strong>#{request.request_number}</strong></div>
    <section className="page-heading"><div><p className="page-overline">SOLICITAÇÃO #{request.request_number}</p><h1>{request.title}</h1><p>{(request.condominium_structures as { name?: string } | null)?.name ?? "Área comum"}</p></div><div className="cv-import-actions"><StatusBadge variant={request.status === "approved" ? "success" : request.status === "rejected" ? "danger" : "warning"}>{statusLabels[request.status as keyof typeof statusLabels] ?? request.status}</StatusBadge><StatusBadge variant={request.priority === "emergency" ? "danger" : "neutral"}>{priorityLabels[request.priority as keyof typeof priorityLabels] ?? request.priority}</StatusBadge></div></section>
    {query.error && <Alert tone="error">{query.error}</Alert>}
    <section className="cv-panel"><h2><ClipboardList size={18}/> Detalhes</h2><div className="cv-read-grid"><p><span>Área comum</span><strong>{(request.condominium_structures as { name?: string } | null)?.name ?? "—"}</strong></p><p><span>Equipamento</span><strong>{(request.maintenance_equipment as { identification?: string } | null)?.identification ?? "Não informado"}</strong></p><p className="cv-read-wide"><span>Descrição</span><strong>{request.description}</strong></p>{request.rejection_reason && <p className="cv-read-wide"><span>Motivo da rejeição</span><strong>{request.rejection_reason}</strong></p>}</div></section>
    {canDecide === true && request.status === "pending_review" && <section className="cv-panel"><h2>Analisar solicitação</h2><div className="cv-import-actions"><form action={decideMaintenanceRequestAction}><input type="hidden" name="request_id" value={id}/><input type="hidden" name="decision" value="approve"/><Button type="submit">Aprovar solicitação</Button></form><form action={decideMaintenanceRequestAction} className="cv-form cv-form-grid"><input type="hidden" name="request_id" value={id}/><input type="hidden" name="decision" value="reject"/><label className="cv-field-lg">Motivo da rejeição<textarea name="rejection_reason" required minLength={3} maxLength={5000} rows={4}/></label><Button variant="secondary" type="submit">Rejeitar solicitação</Button></form></div></section>}
    {canCreateOrder === true && request.status === "approved" && <section className="cv-panel"><div className="cv-panel-heading"><div><h2>Ordem de serviço</h2><p>Crie uma OS corretiva a partir desta solicitação aprovada.</p></div></div><form action={createMaintenanceWorkOrderAction} className="cv-form"><input type="hidden" name="maintenance_request_id" value={id}/><label>Descrição complementar (opcional)<textarea name="description" rows={3} placeholder="Detalhes adicionais para a execução"/></label><Button type="submit">Criar ordem de serviço</Button></form></section>}
    <section className="cv-panel"><h2>Histórico</h2>{(history ?? []).length === 0 ? <EmptyState title="Histórico indisponível" description="Nenhum evento foi registrado."/> : <ul className="cv-history">{history?.map((event) => <li key={event.id}><span>{event.event_type === "created" ? "Registrada" : event.event_type === "approved" ? "Aprovada" : "Rejeitada"}</span><strong>{new Date(event.created_at).toLocaleString("pt-BR")}</strong></li>)}</ul>}</section>
  </div>;
}
