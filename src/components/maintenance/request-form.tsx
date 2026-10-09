"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { createMaintenanceRequestAction } from "@/lib/maintenance/actions";

type Structure = { id: string; name: string };
type Equipment = { id: string; identification: string; structure_id: string };

export function MaintenanceRequestForm({ structures, equipment }: { structures: Structure[]; equipment: Equipment[] }) {
  const [structureId, setStructureId] = useState("");
  const eligibleEquipment = useMemo(() => equipment.filter((item) => item.structure_id === structureId), [equipment, structureId]);
  return <form action={createMaintenanceRequestAction} className="cv-form cv-form-grid"><label>Área comum<select name="structure_id" required value={structureId} onChange={(event) => setStructureId(event.target.value)}><option value="">Selecione</option>{structures.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Equipamento relacionado<select name="equipment_id"><option value="">Opcional</option>{eligibleEquipment.map((item) => <option key={item.id} value={item.id}>{item.identification}</option>)}</select></label><label className="cv-field-lg">Título<input name="title" required minLength={3} maxLength={180}/></label><label className="cv-form-wide">Descrição do problema<textarea name="description" required minLength={3} maxLength={10000} rows={5}/></label><label>Prioridade<select name="priority" defaultValue="medium"><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option><option value="emergency">Emergência</option></select></label><Button type="submit">Registrar solicitação</Button></form>;
}
