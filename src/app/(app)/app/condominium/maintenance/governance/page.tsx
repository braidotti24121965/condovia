import { ContentSelect } from "@/components/ui/form-controls";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { saveApprovalRule, saveServiceType, saveRequirement } from "@/lib/maintenance/management-actions";
import { Feedback, MoneyField, SelectField } from "@/components/maintenance/management-ui";
import { Button } from "@/components/ui/button";
import { documentKinds, money } from "@/lib/maintenance/validation";

type Rule = { id: string; name: string; role_id: string; minimum_amount: number; maximum_amount: number | null; required_approvals: number; active: boolean };
export default async function GovernancePage({ searchParams }: { searchParams: Promise<{ error?: string; updated?: string }> }) {
  const { supabase, context } = await requireCondominiumPermission("maintenance.manage");
  const [{ data: rules, error }, { data: serviceTypes }, { data: rawRoles }, { data: requirements }] = await Promise.all([
    supabase.from("maintenance_approval_rules").select("*").eq("condominium_id", context.id).order("minimum_amount"),
    supabase.from("maintenance_service_types").select("*").eq("condominium_id", context.id).order("name"),
    supabase.from("roles").select("id,name,role_permissions(permissions(code))").eq("scope_type", "condominium").eq("status", "active"),
    supabase.from("maintenance_document_requirements").select("*").eq("condominium_id", context.id),
  ]);
  const roles = (rawRoles ?? []).filter(r => r.role_permissions.some(p => {
    const permission = p.permissions as unknown as { code: string } | null;
    return permission?.code === "maintenance.finance.approve";
  })).map(r => ({ id: r.id, name: r.name }));
  const types = (serviceTypes ?? []).map(t => ({ id: t.id, name: t.name }));
  const RuleFields = ({ item }: { item?: Rule }) => <>{item && <input type="hidden" name="id" value={item.id} />}<label className="cv-field-md">Nome da alçada<input name="name" required minLength={2} maxLength={120} defaultValue={item?.name} /></label>
    <MoneyField label="De (R$), inclusive" name="minimum_amount" value={item?.minimum_amount} /><MoneyField label="Até (R$), inclusive; vazio = sem teto" name="maximum_amount" value={item?.maximum_amount} required={false} />
    <SelectField label="Perfil aprovador" name="role_id" options={roles} selected={item?.role_id} required /><label className="cv-field-xs">Número de aprovadores<input name="required_approvals" type="number" min="1" max="20" required defaultValue={item?.required_approvals ?? 1} /></label>
    <label className="cv-checkbox-label"><input type="checkbox" name="active" defaultChecked={item?.active ?? true} />Alçada ativa</label><Button type="submit">Salvar alçada</Button></>;
  return <div className="cv-page"><section className="page-heading"><div><h1>Alçadas e requisitos</h1><p>Configure autorizações por valor e perfil e os documentos necessários por tipo de serviço.</p></div></section><Feedback params={error ? { error: "Não foi possível carregar alçadas." } : await searchParams} />
    <section className="cv-panel"><h2>Aprovação financeira</h2><p>Todas as alçadas ativas que abrangem o valor precisam ser atendidas. Faixas sobrepostas exigem todos os perfis e quóruns configurados. Sem alçada aplicável, exige Síndico e, acima do limite financeiro, Conselho.</p><p>Alterações de valor, fornecedor, contrato ou tipo de serviço invalidam a aprovação. As regras solicitadas ficam preservadas no histórico da revisão.</p>
      <form action={saveApprovalRule} className="cv-form cv-form-grid"><RuleFields /></form>
      {(rules as Rule[] ?? []).map(r => <details key={r.id} className="cv-maintenance-details"><summary>{r.name} · {money(r.minimum_amount)} até {r.maximum_amount == null ? "sem teto" : money(r.maximum_amount)} · {r.active ? "Ativa" : "Inativa"}</summary><form action={saveApprovalRule} className="cv-form cv-form-grid"><RuleFields item={r} /></form></details>)}
    </section>
    <section className="cv-panel"><h2>Tipos de serviço</h2><form action={saveServiceType} className="cv-form cv-form-grid"><label className="cv-field-md">Nome<input name="name" required minLength={2} maxLength={120} /></label><input type="hidden" name="status" value="active" /><label className="cv-checkbox-label"><input type="checkbox" name="contract_required" />Exigir contrato vigente</label><Button type="submit">Adicionar tipo</Button></form>
      {serviceTypes?.map(t => <details key={t.id} className="cv-maintenance-details"><summary>{t.name} · {t.contract_required ? "Contrato obrigatório" : "Contrato opcional"}</summary><form action={saveServiceType} className="cv-form cv-form-grid"><input type="hidden" name="id" value={t.id} /><label>Nome<input name="name" required minLength={2} defaultValue={t.name} /></label><label>Estado<ContentSelect name="status" defaultValue={t.status}><option value="active">Ativo</option><option value="inactive">Inativo</option></ContentSelect></label><label className="cv-checkbox-label"><input name="contract_required" type="checkbox" defaultChecked={t.contract_required} />Exigir contrato</label><Button type="submit">Salvar tipo</Button></form></details>)}
    </section>
    <section className="cv-panel"><h2>Documentos obrigatórios</h2><form action={saveRequirement} className="cv-form cv-form-grid"><SelectField label="Tipo de serviço" name="service_type_id" options={types} required /><label>Documento<ContentSelect name="document_kind">{Object.entries(documentKinds).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</ContentSelect></label><label>Exigir antes de<ContentSelect name="required_before"><option value="start">Iniciar execução</option><option value="complete">Concluir serviço</option></ContentSelect></label><Button type="submit">Adicionar exigência</Button></form>
      <ul>{requirements?.map(r => <li key={r.id}>{types.find(t => t.id === r.service_type_id)?.name} · {documentKinds[r.document_kind]} · {r.required_before === "start" ? "Antes da execução" : "Antes da conclusão"}<form action={saveRequirement} className="cv-form"><input type="hidden" name="service_type_id" value={r.service_type_id} /><input type="hidden" name="document_kind" value={r.document_kind} /><input type="hidden" name="required_before" value={r.required_before} /><input type="hidden" name="remove" value="true" /><Button type="submit" variant="secondary">Remover exigência</Button></form></li>)}</ul>
    </section>
  </div>;
}
