import Link from "next/link";
import { ChevronRight, Settings, Wrench } from "lucide-react";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { EquipmentForm } from "@/components/maintenance/equipment-form";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { saveEquipmentCategory, saveMaintenanceSettings } from "@/lib/maintenance/actions";
import type { Equipment } from "@/lib/maintenance/types";

export const metadata = { title: "Manutenção" };

export default async function MaintenancePage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { supabase, context } = await requireCondominiumPermission("maintenance.read");
  const [{ data: equipment }, { data: structures }, { data: categories }, { data: settings }, { data: canManage }, params] = await Promise.all([
    supabase.from("maintenance_equipment").select("id,identification,location,manufacturer,model,serial_number,installed_at,warranty_until,status,structure_id,condominium_structures(name),maintenance_equipment_categories(name)").eq("condominium_id", context.id).order("identification"),
    supabase.from("condominium_structures").select("id,name").eq("condominium_id", context.id).eq("status", "active").order("name"),
    supabase.from("maintenance_equipment_categories").select("id,name").eq("condominium_id", context.id).eq("status", "active").order("name"),
    supabase.from("maintenance_settings").select("*").eq("condominium_id", context.id).maybeSingle(),
    supabase.rpc("has_permission", { permission_code: "maintenance.manage", target_condominium_id: context.id }), searchParams ]);
  const rows = (equipment ?? []) as unknown as Equipment[];
  return <div className="cv-page"><div className="breadcrumbs"><Link href="/app/condominium">Condomínio</Link><ChevronRight size={14}/><strong>Manutenção</strong></div>
    <section className="page-heading"><div><p className="page-overline">P8.1 · ESTRUTURA BÁSICA</p><h1>Manutenção</h1><p>Equipamentos e configurações das áreas comuns de {context.name}.</p></div></section>
    {params.error && <Alert tone="error">{params.error}</Alert>}{params.saved && <Alert tone="success">Alterações salvas.</Alert>}
    <section className="cv-panel"><div className="cv-panel-heading"><div><h2><Wrench size={18}/> Equipamentos</h2><p>{rows.length} equipamento(s) cadastrado(s). Equipamentos desativados permanecem no histórico.</p></div></div>
      {rows.length === 0 ? <EmptyState title="Nenhum equipamento cadastrado" description="Cadastre equipamentos vinculados às estruturas das áreas comuns."/> : <div className="cv-table-wrap"><table className="cv-table"><thead><tr><th>Identificação</th><th>Estrutura</th><th>Categoria</th><th>Fabricante/modelo</th><th>Situação</th></tr></thead><tbody>{rows.map((item)=><tr key={item.id}><td><strong>{item.identification}</strong><br/><span className="cv-muted">{item.location || "Local não informado"}</span></td><td>{item.condominium_structures?.name ?? "—"}</td><td>{item.maintenance_equipment_categories?.name ?? "—"}</td><td>{[item.manufacturer,item.model].filter(Boolean).join(" / ") || "—"}</td><td><span className={`cv-status cv-status-${item.status}`}>{item.status === "active" ? "Ativo" : item.status === "inactive" ? "Inativo" : "Desativado"}</span></td></tr>)}</tbody></table></div>}
    </section>
    {canManage === true && <><section className="cv-panel"><div className="cv-panel-heading"><div><h2><Wrench size={18}/> Novo equipamento</h2><p>O equipamento deve pertencer a uma estrutura ativa do condomínio.</p></div></div><EquipmentForm structures={structures ?? []} categories={categories ?? []}/></section>
      <section className="cv-panel"><div className="cv-panel-heading"><div><h2><Settings size={18}/> Configurações básicas</h2><p>Valores padrão da fundação de manutenção para este condomínio.</p></div></div><form action={saveMaintenanceSettings} className="cv-form"><div className="cv-maintenance-settings-grid"><label className="cv-checkbox-label cv-maintenance-resident-toggle"><input type="checkbox" name="resident_requests_enabled" defaultChecked={settings?.resident_requests_enabled ?? false}/> <span>Permitir solicitações de moradores</span></label><label className="cv-maintenance-setting-money">Limite financeiro (R$)<input name="financial_approval_limit" type="number" min="0" step="0.01" inputMode="decimal" placeholder="R$ 0,00" defaultValue={settings?.financial_approval_limit ?? 0}/></label><label className="cv-maintenance-setting-days">Antecedência de alertas (dias)<input name="alert_advance_days" type="number" min="0" defaultValue={settings?.alert_advance_days ?? 7}/></label><label className="cv-maintenance-setting-days">Prazo baixa (dias)<input name="priority_low_days" type="number" min="1" defaultValue={settings?.priority_low_days ?? 15}/></label><label className="cv-maintenance-setting-days">Prazo média (dias)<input name="priority_medium_days" type="number" min="1" defaultValue={settings?.priority_medium_days ?? 7}/></label><label className="cv-maintenance-setting-days">Prazo alta (horas)<input name="priority_high_hours" type="number" min="1" defaultValue={settings?.priority_high_hours ?? 48}/></label></div><Button type="submit">Salvar configurações</Button></form></section>
      <section className="cv-panel"><div className="cv-panel-heading"><div><h2>Categorias</h2><p>{(categories ?? []).length} categoria(s) ativa(s).</p></div></div><form action={saveEquipmentCategory} className="cv-form"><div className="cv-maintenance-category-row"><label>Nova categoria<input name="name" required placeholder="Ex.: Bombas, Elevadores, Elétrica" /></label><Button type="submit">Adicionar categoria</Button></div></form></section></>}
  </div>;
}
