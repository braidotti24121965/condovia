import { ContentSelect, DateInput } from "@/components/ui/form-controls";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { generateDueOrders, savePlan } from "@/lib/maintenance/management-actions";
import { Feedback, MoneyField, SelectField } from "@/components/maintenance/management-ui";
import { Button } from "@/components/ui/button";
import { civilDate } from "@/lib/maintenance/validation";

type Plan = { id: string; structure_id: string; equipment_id: string | null; service_type_id: string | null; service_provider_id: string | null; contract_id: string | null; responsible_user_account_id: string | null; description: string; interval_days: number; next_due_on: string; advance_days: number; estimated_amount: number; checklist_template: string[]; status: string };
export default async function PlansPage({ searchParams }: { searchParams: Promise<{ error?: string; updated?: string }> }) {
  const { supabase, context } = await requireCondominiumPermission("maintenance.plans.manage");
  const [plans, structures, equipment, types, providers, contracts, users] = await Promise.all([
    supabase.from("maintenance_plans").select("*").eq("condominium_id", context.id).order("next_due_on"),
    supabase.from("condominium_structures").select("id,name").eq("condominium_id", context.id).eq("status", "active"),
    supabase.from("maintenance_equipment").select("id,identification").eq("condominium_id", context.id).eq("status", "active"),
    supabase.from("maintenance_service_types").select("id,name").eq("condominium_id", context.id).eq("status", "active"),
    supabase.from("service_providers").select("id,full_name").eq("condominium_id", context.id).eq("status", "active"),
    supabase.from("maintenance_contracts").select("id,title").eq("condominium_id", context.id).eq("status", "active"),
    supabase.rpc("list_maintenance_work_order_assignees", { p_condominium_id: context.id }),
  ]);
  const userOptions = ((users.data ?? []) as { user_account_id: string; display_name: string }[]).map(u => ({ id: u.user_account_id, name: u.display_name }));
  const Fields = ({ item }: { item?: Plan }) => <>{item && <input type="hidden" name="id" value={item.id} />}
    <label className="cv-form-wide">Descrição do serviço<textarea name="description" required minLength={3} maxLength={10000} defaultValue={item?.description} /></label>
    <SelectField name="structure_id" label="Área comum" options={structures.data ?? []} selected={item?.structure_id} required />
    <SelectField name="equipment_id" label="Equipamento" options={(equipment.data ?? []).map(e => ({ id: e.id, name: e.identification }))} selected={item?.equipment_id} />
    <SelectField name="service_type_id" label="Tipo de serviço" options={types.data ?? []} selected={item?.service_type_id} />
    <SelectField name="service_provider_id" label="Fornecedor" options={(providers.data ?? []).map(p => ({ id: p.id, name: p.full_name }))} selected={item?.service_provider_id} />
    <SelectField name="contract_id" label="Contrato" options={(contracts.data ?? []).map(c => ({ id: c.id, name: c.title }))} selected={item?.contract_id} />
    <SelectField name="responsible_user_account_id" label="Responsável interno" options={userOptions} selected={item?.responsible_user_account_id} />
    <label className="cv-field-xs">Intervalo (dias)<input type="number" name="interval_days" min="1" max="3660" required defaultValue={item?.interval_days ?? 30} /></label>
    <label className="cv-field-date">Próximo vencimento<DateInput name="next_due_on" required defaultValue={item?.next_due_on} /></label>
    <label className="cv-field-xs">Gerar com antecedência (dias)<input type="number" name="advance_days" min="0" max="365" required defaultValue={item?.advance_days ?? 7} /></label>
    <MoneyField label="Orçamento previsto (R$)" name="estimated_amount" value={item?.estimated_amount} />
    <label>Situação<ContentSelect name="status" defaultValue={item?.status ?? "active"}><option value="active">Ativo</option><option value="paused">Pausado</option><option value="ended">Encerrado</option></ContentSelect></label>
    <label className="cv-form-wide">Checklist obrigatório (um item por linha)<textarea name="checklist_template" rows={4} defaultValue={item?.checklist_template?.join("\n")} /></label><div className="cv-form-actions"><Button type="submit">Salvar plano</Button></div></>;
  return <div className="cv-page"><section className="page-heading"><div><h1>Manutenção preventiva</h1><p>Planos recorrentes com geração de OS por vencimento, sem duplicar o mesmo ciclo.</p></div><form action={generateDueOrders}><div className="cv-form-actions"><Button type="submit">Gerar OS previstas agora</Button></div></form></section>
    <Feedback params={plans.error ? { error: "Não foi possível carregar os planos." } : await searchParams} />
    <section className="cv-panel"><h2>Novo plano</h2><form action={savePlan} className="cv-form cv-form-grid"><Fields /></form></section>
    <section className="cv-panel"><h2>Planos cadastrados</h2>{!plans.data?.length && <p>Nenhum plano cadastrado.</p>}{(plans.data as Plan[] ?? []).map(p => <details key={p.id} className="cv-maintenance-details"><summary>{p.description} · próximo {civilDate(p.next_due_on)} · {p.status === "active" ? "Ativo" : p.status === "paused" ? "Pausado" : "Encerrado"}</summary><form action={savePlan} className="cv-form cv-form-grid"><Fields item={p} /></form></details>)}</section>
  </div>;
}
