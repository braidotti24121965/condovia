import { ContentSelect, DateInput } from "@/components/ui/form-controls";
import Link from "next/link";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { manageOrderTeam, decideApproval, requestApproval, saveChecklist, saveQuotation, selectQuotation, updateOrderDetails } from "@/lib/maintenance/management-actions";
import { DocumentUpload, MoneyField, SelectField } from "@/components/maintenance/management-ui";
import { DocumentList } from "@/components/maintenance/document-list";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { maintenanceKinds, money, civilDate } from "@/lib/maintenance/validation";

type Detail = { id: string; due_at: string | null; responsible_user_account_id: string | null; status: string; maintenance_kind: string; service_type_id: string | null; contract_id: string | null; service_provider_id: string | null; occurrence_id: string | null; scheduled_on: string | null };
type Finance = { actual_cost_recorded: boolean; estimated_amount: number; actual_amount: number; approved_amount: number | null; financial_revision: number; approved_revision: number | null; selected_quotation_id: string | null };
type Step = { id: string; revision: number; amount: number; rule_name: string; required_approvals: number; role_id: string; maintenance_approval_decisions: { id: string; decision: string; reason: string; created_at: string; decided_by: string; decided_by_name: string }[] };
export async function OrderManagement({ order }: { order: Detail }) {
  const { supabase, context } = await requireCondominiumPermission("maintenance.orders.read");
  const codes = ["maintenance.finance.read", "maintenance.finance.manage", "maintenance.finance.approve", "maintenance.documents.read", "maintenance.documents.manage", "maintenance.orders.manage", "maintenance.orders.update", "occurrences.read"];
  const permissions = await Promise.all(codes.map(code => supabase.rpc("has_permission", { permission_code: code, target_condominium_id: context.id })));
  const can = (code: string) => permissions[codes.indexOf(code)]?.data === true;
  const closed = ["completed", "cancelled"].includes(order.status);
  const [{ data: rawUsers }, { data: participants }] = await Promise.all([
    supabase.rpc("list_maintenance_work_order_assignees", { p_condominium_id: context.id }),
    supabase.from("maintenance_work_order_participants").select("user_account_id").eq("work_order_id", order.id).eq("condominium_id", context.id),
  ]);
  const userOptions = ((rawUsers ?? []) as { user_account_id: string; display_name: string }[]).map(u => ({ id: u.user_account_id, name: u.display_name }));
  const [types, providers, contracts, occurrences, checklist, finances, quotations, steps] = await Promise.all([
    supabase.from("maintenance_service_types").select("id,name").eq("condominium_id", context.id).eq("status", "active"),
    supabase.from("service_providers").select("id,full_name,company_name").eq("condominium_id", context.id).eq("status", "active"),
    supabase.from("maintenance_contracts").select("id,title,service_provider_id").eq("condominium_id", context.id).eq("status", "active"),
    can("occurrences.read") ? supabase.from("occurrences").select("id,title,occurrence_number").eq("condominium_id", context.id).eq("confidential", false).order("created_at", { ascending: false }).limit(100) : Promise.resolve({ data: [] }),
    supabase.from("maintenance_checklist_items").select("id,description,required,completed").eq("work_order_id", order.id).eq("condominium_id", context.id).order("id"),
    can("maintenance.finance.read") ? supabase.rpc("get_maintenance_order_finances", { p_order: order.id }) : Promise.resolve({ data: null }),
    can("maintenance.finance.read") ? supabase.from("maintenance_quotations").select("id,service_provider_id,amount,description,valid_until,status").eq("work_order_id", order.id).eq("condominium_id", context.id).order("amount") : Promise.resolve({ data: [] }),
    can("maintenance.finance.read") ? supabase.from("maintenance_approval_steps").select("id,revision,amount,rule_name,required_approvals,role_id,maintenance_approval_decisions(id,decision,reason,created_at,decided_by,decided_by_name)").eq("work_order_id", order.id).eq("condominium_id", context.id).order("revision", { ascending: false }) : Promise.resolve({ data: [] }),
  ]);
  const finance = finances.data as Finance | null;
  const providerOptions = (providers.data ?? []).map(p => ({ id: p.id, name: [p.full_name, p.company_name].filter(Boolean).join(" · ") }));
  const approved = finance && finance.approved_revision === finance.financial_revision;
  return <>
    <section className="cv-panel"><h2>Responsável e equipe</h2><p>Equipe de execução: {(participants ?? []).map(p => userOptions.find(u => u.id === p.user_account_id)?.name ?? "Participante cadastrado").join(", ") || "Nenhum participante adicional"}</p>
      {can("maintenance.orders.manage") && !closed && <form action={manageOrderTeam} className="cv-form cv-form-grid"><input type="hidden" name="work_order_id" value={order.id} /><SelectField label="Responsável interno" name="responsible_user_account_id" options={userOptions} selected={order.responsible_user_account_id} required /><label className="cv-field-date">Prazo<DateInput name="due_at" defaultValue={order.due_at ?? ""} /></label><SelectField label="Adicionar ou remover participante" name="participant_user_account_id" options={userOptions} /><label>Ação da equipe<ContentSelect name="remove_participant"><option value="false">Adicionar participante</option><option value="true">Remover participante</option></ContentSelect></label><Button type="submit">Salvar responsável e equipe</Button></form>}
    </section>
    <section className="cv-panel"><h2>Contratação, custos e programação</h2>
      <div className="cv-read-grid"><p><span>Natureza</span><strong>{maintenanceKinds[order.maintenance_kind]}</strong></p><p><span>Programação</span><strong>{civilDate(order.scheduled_on)}</strong></p><p><span>Contrato</span><strong>{contracts.data?.find(c => c.id === order.contract_id)?.title ?? (order.contract_id ? "Contrato vinculado" : "Sem contrato")}</strong></p>
        {finance && <><p><span>Previsto</span><strong>{money(finance.estimated_amount)}</strong></p><p><span>Aprovado</span><strong>{finance.approved_amount == null ? "Pendente" : money(finance.approved_amount)}</strong></p><p><span>Efetivo</span><strong>{finance.actual_cost_recorded ? money(finance.actual_amount) : "Não registrado"}</strong></p><p><span>Autorização financeira</span><strong>{approved ? "Aprovada" : "Sem aprovação vigente"} · revisão {finance.financial_revision}</strong></p></>}
      </div>
      {order.occurrence_id && <p><Link href={`/app/occurrences/${order.occurrence_id}`}>Consultar ocorrência de origem</Link></p>}
      {can("maintenance.finance.manage") && finance && !closed && <form action={updateOrderDetails} className="cv-form cv-form-grid"><input type="hidden" name="work_order_id" value={order.id} />
        <label>Natureza<ContentSelect name="maintenance_kind" defaultValue={order.maintenance_kind}>{Object.entries(maintenanceKinds).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</ContentSelect></label>
        <SelectField label="Tipo de serviço" name="service_type_id" options={types.data ?? []} selected={order.service_type_id} />
        <SelectField label="Fornecedor" name="service_provider_id" options={providerOptions} selected={order.service_provider_id} />
        <SelectField label="Contrato vigente" name="contract_id" options={(contracts.data ?? []).map(c => ({ id: c.id, name: c.title }))} selected={order.contract_id} />
        {can("occurrences.read") ? <SelectField label="Ocorrência vinculada" name="occurrence_id" options={(occurrences.data ?? []).map(o => ({ id: o.id, name: `#${o.occurrence_number} · ${o.title}` }))} selected={order.occurrence_id} /> : <input type="hidden" name="occurrence_id" value={order.occurrence_id ?? ""} />}
        <label className="cv-field-date">Programada para<DateInput name="scheduled_on" defaultValue={order.scheduled_on ?? ""} /></label>
        <MoneyField label="Previsto (R$)" name="estimated_amount" value={finance.estimated_amount} /><MoneyField label="Custo efetivo (R$)" name="actual_amount" value={finance.actual_amount} />
        <p className="cv-form-wide cv-muted">Alterações de orçamento, fornecedor, contrato ou tipo de serviço exigem nova autorização.</p><Button type="submit">Salvar contratação e custos</Button>
      </form>}
    </section>
    {finance && <section className="cv-panel"><h2>Cotações e orçamentos</h2><div className="cv-table-wrap"><table className="cv-table"><thead><tr><th>Fornecedor</th><th>Valor</th><th>Validade</th><th>Proposta</th><th>Ação</th></tr></thead><tbody>{quotations.data?.map(q => <tr key={q.id}><td>{providerOptions.find(p => p.id === q.service_provider_id)?.name ?? "Fornecedor"}</td><td>{money(q.amount)}</td><td>{civilDate(q.valid_until)}</td><td>{q.description}</td><td>{q.status === "selected" ? "Selecionada" : can("maintenance.finance.manage") && !closed && <form action={selectQuotation}><input type="hidden" name="work_order_id" value={order.id} /><input type="hidden" name="quotation_id" value={q.id} /><Button type="submit" variant="secondary">Selecionar proposta</Button></form>}</td></tr>)}</tbody></table></div>
      {can("maintenance.finance.manage") && !closed && <form action={saveQuotation} className="cv-form cv-form-grid"><input type="hidden" name="work_order_id" value={order.id} /><SelectField label="Fornecedor" name="service_provider_id" options={providerOptions} required /><MoneyField label="Valor (R$)" name="amount" /><label className="cv-field-date">Validade<DateInput name="valid_until" required /></label><label className="cv-form-wide">Escopo da proposta<textarea name="description" required minLength={3} maxLength={10000} /></label><Button type="submit">Registrar cotação</Button></form>}
    </section>}
    {finance && <section className="cv-panel"><h2>Aprovação financeira</h2>{!approved && !closed && <Alert tone="info">Serviços com custo exigem aprovação quando o controle financeiro está ativado. O banco verifica as alçadas antes da execução e da conclusão.</Alert>}
      {can("maintenance.finance.manage") && !closed && <form action={requestApproval}><input type="hidden" name="work_order_id" value={order.id} /><Button type="submit">Solicitar aprovação do valor atual</Button></form>}
      {!(steps.data?.length) && <p>Nenhuma aprovação solicitada.</p>}{(steps.data as Step[] ?? []).map(step => {
        const decisions = step.maintenance_approval_decisions ?? [];
        const count = decisions.filter(d => d.decision === "approved").length;
        const current = step.revision === finance.financial_revision;
        const rejected = decisions.some(d => d.decision === "rejected");
        return <details key={step.id} className="cv-maintenance-details" open={current}><summary>{step.rule_name} · {money(step.amount)} · revisão {step.revision} · {rejected ? "Rejeitada" : `${count}/${step.required_approvals} aprovações`}{!current ? " · Histórico" : ""}</summary>
          <ul>{decisions.map(d => <li key={d.id}>{d.decision === "approved" ? "Aprovada" : "Rejeitada"} · {d.decided_by_name} · {d.reason} · {new Date(d.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</li>)}</ul>
          {can("maintenance.finance.approve") && current && !closed && !rejected && !approved && <form action={decideApproval} className="cv-form"><input type="hidden" name="work_order_id" value={order.id} /><input type="hidden" name="step_id" value={step.id} /><label>Justificativa<input name="reason" required minLength={3} maxLength={2000} /></label><div className="cv-import-actions"><Button type="submit" name="decision" value="approved">Aprovar valor</Button><Button type="submit" variant="secondary" name="decision" value="rejected">Rejeitar valor</Button></div></form>}
        </details>;
      })}
    </section>}
    <section className="cv-panel"><h2>Checklist de execução</h2>{!checklist.data?.length && <p>Nenhum item cadastrado.</p>}{checklist.data?.map(item => <form action={saveChecklist} key={item.id} className="cv-form cv-maintenance-checklist"><input type="hidden" name="work_order_id" value={order.id} /><input type="hidden" name="item_id" value={item.id} /><input type="hidden" name="description" value={item.description} /><label className="cv-checkbox-label"><input type="checkbox" name="completed" defaultChecked={item.completed} disabled={closed || !can("maintenance.orders.update")} />{item.description} {item.required ? "(obrigatório)" : "(opcional)"}</label>{can("maintenance.orders.update") && !closed && <Button type="submit" variant="secondary">Salvar item</Button>}</form>)}
      {can("maintenance.orders.manage") && !closed && <form action={saveChecklist} className="cv-form cv-form-grid"><input type="hidden" name="work_order_id" value={order.id} /><label className="cv-form-wide">Atividade / verificação<input name="description" required minLength={2} maxLength={500} /></label><label className="cv-checkbox-label"><input type="checkbox" name="required" defaultChecked />Obrigatório para concluir</label><Button type="submit">Adicionar item</Button></form>}
    </section>
    {can("maintenance.documents.read") && <section className="cv-panel"><h2>Documentos da OS</h2><DocumentList target="work_order" id={order.id} canUpload={can("maintenance.documents.manage")} />{can("maintenance.documents.manage") && <DocumentUpload target="work_order" id={order.id} />}</section>}
  </>;
}
