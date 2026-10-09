import Link from "next/link";
import { ChevronRight, ClipboardCheck } from "lucide-react";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { transitionMaintenanceWorkOrderAction, updateMaintenanceWorkOrderActivityAction } from "@/lib/maintenance/actions";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { formatEventDateTimeInTimezone } from "@/lib/gatehouse/timezone";
import { getAssigneeDisplayName, getResponsibleDisplayName } from "@/lib/maintenance/work-order-presenters";

const statuses = { open: "Aberta", assigned: "Atribuída", in_progress: "Em execução", awaiting_validation: "Aguardando validação", completed: "Concluída", cancelled: "Cancelada" } as const;
const priorities = { low: "Baixa", medium: "Média", high: "Alta", emergency: "Emergência" } as const;
type MaintenanceAssignee = { user_account_id: string; display_name: string };
const historyEventLabels: Record<string, string> = { created: "Ordem de serviço criada", assigned: "Responsável atribuído", started: "Execução iniciada", submitted_for_validation: "Enviada para validação", validated: "Ordem de serviço validada", cancelled: "Ordem de serviço cancelada", activity_updated: "Registro técnico atualizado" };

export default async function WorkOrderDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; updated?: string }> }) {
  const { supabase, context } = await requireCondominiumPermission("maintenance.orders.read");
  const { id } = await params;
  const query = await searchParams;
  const [{ data: order, error: orderError }, { data: history }, { data: canManage }, { data: canUpdate }, { data: rawUsers }] = await Promise.all([
    supabase.from("maintenance_work_orders").select("*,condominium_structures(name),maintenance_equipment(identification),service_providers!maintenance_work_orders_service_provider_id_fkey(full_name,company_name),responsible:user_accounts!maintenance_work_orders_responsible_user_account_id_fkey(id,people(full_name,preferred_name))").eq("id", id).eq("condominium_id", context.id).maybeSingle(),
    supabase.from("maintenance_work_order_history").select("id,event_type,previous_status,new_status,reason,created_at").eq("work_order_id", id).eq("condominium_id", context.id).order("created_at"),
    supabase.rpc("has_permission", { permission_code: "maintenance.orders.manage", target_condominium_id: context.id }),
    supabase.rpc("has_permission", { permission_code: "maintenance.orders.update", target_condominium_id: context.id }),
    supabase.rpc("list_maintenance_work_order_assignees", { p_condominium_id: context.id }),
  ]);
  const users = rawUsers as MaintenanceAssignee[] | null;
  if (orderError) {
    console.error("Erro ao carregar ordem de serviço", { workOrderId: id, condominiumId: context.id, code: orderError.code, message: orderError.message, details: orderError.details, hint: orderError.hint });
    return <div className="cv-page"><Alert tone="error">Não foi possível carregar os dados da ordem de serviço. Tente novamente ou contate o suporte.</Alert></div>;
  }
  if (!order) return <div className="cv-page"><EmptyState title="Ordem de serviço não encontrada" description="A ordem pode ter sido removida ou não pertence a este condomínio."/></div>;
  const responsibleName = getResponsibleDisplayName(order.responsible) ?? getAssigneeDisplayName(users, order.responsible_user_account_id);
  if (order.responsible_user_account_id && !responsibleName) {
    console.error("Responsável persistido sem nome relacionado ao carregar ordem de serviço", { workOrderId: id, responsibleUserAccountId: order.responsible_user_account_id, condominiumId: context.id });
  }
  const provider = order.service_providers as { full_name?: string; company_name?: string } | null;
  return <div className="cv-page"><div className="breadcrumbs"><Link href="/app/condominium/maintenance/work-orders">Ordens de serviço</Link><ChevronRight size={14}/><strong>OS #{order.work_order_number}</strong></div>
    <section className="page-heading"><div><p className="page-overline">ORDEM DE SERVIÇO #{order.work_order_number}</p><h1>{order.description}</h1><p>{order.condominium_structures?.name ?? "Área comum"}</p></div><div className="cv-import-actions"><StatusBadge variant={order.status === "completed" ? "success" : order.status === "cancelled" ? "danger" : "neutral"}>{statuses[order.status as keyof typeof statuses] ?? order.status}</StatusBadge><StatusBadge variant={order.priority === "emergency" ? "danger" : "neutral"}>{priorities[order.priority as keyof typeof priorities] ?? order.priority}</StatusBadge></div></section>
    {query.error && <Alert tone="error">{query.error}</Alert>}{query.updated && <Alert tone="success">Ordem de serviço atualizada.</Alert>}
    <section className="cv-panel"><h2><ClipboardCheck size={18}/> Dados da ordem</h2><div className="cv-read-grid"><p><span>Área comum</span><strong>{order.condominium_structures?.name ?? "—"}</strong></p><p><span>Equipamento</span><strong>{order.maintenance_equipment?.identification ?? "Não informado"}</strong></p><p><span>Responsável</span><strong>{order.responsible_user_account_id ? responsibleName ?? "Responsável não identificado" : "A definir"}</strong></p><p><span>Prestador cadastrado</span><strong>{provider ? [provider.full_name, provider.company_name].filter(Boolean).join(" · ") : "Nenhum"}</strong></p><p><span>Prazo</span><strong>{order.due_at ? new Date(`${order.due_at}T00:00:00Z`).toLocaleDateString("pt-BR") : "Não definido"}</strong></p><p><span>Origem</span><strong>{order.origin === "maintenance_request" ? "Solicitação aprovada" : "Abertura direta"}</strong></p><p className="cv-read-wide"><span>Descrição</span><strong>{order.description}</strong></p></div></section>
    {(canUpdate === true || canManage === true) && !["completed", "cancelled"].includes(order.status) && <section className="cv-panel"><h2>Execução e registro técnico</h2><form action={updateMaintenanceWorkOrderActivityAction} className="cv-form cv-form-grid"><input type="hidden" name="work_order_id" value={id}/><label className="cv-form-wide">Atividades executadas<textarea name="activity_notes" rows={5} defaultValue={order.activity_notes ?? ""}/></label><label className="cv-form-wide">Observações<textarea name="observations" rows={4} defaultValue={order.observations ?? ""}/></label><label className="cv-form-wide">Conclusão técnica<textarea name="technical_conclusion" rows={4} defaultValue={order.technical_conclusion ?? ""}/></label><Button className="cv-form-action" type="submit">Salvar registro técnico</Button></form></section>}
    {(canManage === true || canUpdate === true) && <section className="cv-panel"><h2>Próxima etapa</h2><div className="cv-import-actions">{canManage === true && order.status === "open" && <form action={transitionMaintenanceWorkOrderAction} className="cv-form"><input type="hidden" name="work_order_id" value={id}/><input type="hidden" name="action" value="assign"/><label>Responsável interno<select name="responsible_user_account_id" required><option value="">Selecione</option>{(users ?? []).map((item) => <option key={item.user_account_id} value={item.user_account_id}>{item.display_name}</option>)}</select></label><Button type="submit">Atribuir</Button></form>}{canUpdate === true && order.status === "assigned" && <form action={transitionMaintenanceWorkOrderAction}><input type="hidden" name="work_order_id" value={id}/><input type="hidden" name="action" value="start"/><Button type="submit">Iniciar execução</Button></form>}{canUpdate === true && order.status === "in_progress" && <form action={transitionMaintenanceWorkOrderAction}><input type="hidden" name="work_order_id" value={id}/><input type="hidden" name="action" value="submit_validation"/><Button type="submit">Enviar para validação</Button></form>}{canManage === true && order.status === "awaiting_validation" && <form action={transitionMaintenanceWorkOrderAction}><input type="hidden" name="work_order_id" value={id}/><input type="hidden" name="action" value="validate"/><Button type="submit">Validar e concluir</Button></form>}{canManage === true && !["completed", "cancelled"].includes(order.status) && <form action={transitionMaintenanceWorkOrderAction} className="cv-form"><input type="hidden" name="work_order_id" value={id}/><input type="hidden" name="action" value="cancel"/><label>Motivo do cancelamento<input name="reason" required minLength={3}/></label><Button variant="secondary" type="submit">Cancelar OS</Button></form>}</div></section>}
    <section className="cv-panel"><h2>Histórico</h2>{(history ?? []).length === 0 ? <EmptyState title="Histórico indisponível" description="Nenhum evento foi registrado."/> : <ul className="cv-history">{history?.map((event) => <li key={event.id}><span>{historyEventLabels[event.event_type] ?? `Evento de manutenção: ${event.event_type}`}</span><strong>{formatEventDateTimeInTimezone(event.created_at, "America/Sao_Paulo")}{event.reason ? ` · ${event.reason}` : ""}</strong></li>)}</ul>}</section>
  </div>;
}
