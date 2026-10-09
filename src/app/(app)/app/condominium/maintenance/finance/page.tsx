import Link from "next/link";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { Alert } from "@/components/ui/feedback";
import { money, civilDate } from "@/lib/maintenance/validation";
export default async function FinancePage() {
  const { supabase, context } = await requireCondominiumPermission("maintenance.finance.read");
  const [{ data: orders, error }, { data: steps }, { data: expenses }] = await Promise.all([
    supabase.rpc("list_maintenance_order_finances", { p_condominium_id: context.id }),
    supabase.from("maintenance_approval_steps").select("id,work_order_id,revision,rule_name,required_approvals,maintenance_approval_decisions(decision)").eq("condominium_id", context.id),
    supabase.from("maintenance_expenses").select("id,work_order_id,amount,status,created_at").eq("condominium_id", context.id).order("created_at", { ascending: false }),
  ]);
  type Order = { id: string; work_order_number: number; description: string; status: string; due_at: string | null; estimated_amount: number; approved_amount: number | null; actual_amount: number; financial_revision: number; approved_revision: number | null };
  const rows = (orders ?? []) as Order[];
  return <div className="cv-page"><section className="page-heading"><div><h1>Custos e aprovações</h1><p>Orçamentos, autorizações vigentes e despesas geradas no aceite técnico.</p></div><Link className="button button-secondary" href="/api/maintenance/expenses">Exportar despesas (CSV)</Link></section>
    {error && <Alert tone="error">Não foi possível carregar os valores.</Alert>}
    <section className="cv-panel"><div className="cv-read-grid"><p><span>Orçamento previsto</span><strong>{money(rows.reduce((a, o) => a + Number(o.estimated_amount), 0))}</strong></p><p><span>Custo efetivo</span><strong>{money(rows.reduce((a, o) => a + Number(o.actual_amount), 0))}</strong></p><p><span>Despesas para financeiro</span><strong>{money((expenses ?? []).reduce((a, e) => a + Number(e.amount), 0))}</strong></p></div></section>
    <section className="cv-panel"><h2>Controle por OS</h2><div className="cv-table-wrap"><table className="cv-table"><thead><tr><th>OS</th><th>Previsto</th><th>Aprovado</th><th>Efetivo</th><th>Prazo</th><th>Aprovação</th></tr></thead><tbody>{rows.map(o => <tr key={o.id}><td><Link href={`/app/condominium/maintenance/work-orders/${o.id}`}>OS #{o.work_order_number} · {o.description}</Link></td><td>{money(o.estimated_amount)}</td><td>{o.approved_amount == null ? "—" : money(o.approved_amount)}</td><td>{money(o.actual_amount)}</td><td>{civilDate(o.due_at)}</td><td>{o.approved_revision === o.financial_revision ? "Aprovada" : Number(o.estimated_amount) > 0 || Number(o.actual_amount) > 0 ? "Sem aprovação vigente" : "Sem custo"}</td></tr>)}</tbody></table></div></section>
    <section className="cv-panel"><h2>Alçadas pendentes</h2><ul>{steps?.filter(s => rows.some(o => o.id === s.work_order_id && o.financial_revision === s.revision && !["completed", "cancelled"].includes(o.status)) && s.maintenance_approval_decisions.filter(d => d.decision === "approved").length < s.required_approvals && !s.maintenance_approval_decisions.some(d => d.decision === "rejected")).map(s => <li key={s.id}><Link href={`/app/condominium/maintenance/work-orders/${s.work_order_id}`}>{s.rule_name} · revisão {s.revision}</Link></li>)}</ul></section>
    <section className="cv-panel"><h2>Despesas geradas</h2><p>O aceite de OS com custo efetivo gera uma despesa única, disponível para integração com o módulo Financeiro.</p><ul>{expenses?.map(e => <li key={e.id}><Link href={`/app/condominium/maintenance/work-orders/${e.work_order_id}`}>{money(e.amount)} · {civilDate(e.created_at)} · {e.status === "pending_finance" ? "Pendente de financeiro" : "Exportada"}</Link></li>)}</ul></section>
  </div>;
}
