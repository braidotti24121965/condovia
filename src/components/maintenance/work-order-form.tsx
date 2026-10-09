import { Button } from "@/components/ui/button";
import { createMaintenanceWorkOrderAction } from "@/lib/maintenance/actions";

type Option = { id: string; name: string };
type Equipment = { id: string; identification: string; structure_id: string };

export function WorkOrderForm({ structures, equipment, users, providers }: { structures: Option[]; equipment: Equipment[]; users: Option[]; providers: Option[] }) {
  return <form action={createMaintenanceWorkOrderAction} className="cv-form cv-form-grid cv-work-order-form">
    <label className="cv-field-lg">Estrutura<select name="structure_id" required defaultValue=""><option value="">Selecione a área comum</option>{structures.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label className="cv-field-lg">Equipamento relacionado<select name="equipment_id"><option value="">Opcional</option>{equipment.map((item) => <option key={item.id} value={item.id}>{item.identification}</option>)}</select></label>
    <label className="cv-form-wide">Descrição do serviço<textarea name="description" required minLength={3} maxLength={10000} rows={4}/></label>
    <label>Prioridade<select name="priority" defaultValue="medium"><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option><option value="emergency">Emergência</option></select></label>
    <label>Responsável interno<select name="responsible_user_account_id"><option value="">A definir</option>{users.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label>Prestador cadastrado<select name="service_provider_id"><option value="">Nenhum</option>{providers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label>Prazo<input name="due_at" type="date" /></label>
    <Button type="submit">Criar ordem de serviço</Button>
  </form>;
}
