"use client";

import { ContentSelect } from "@/components/ui/form-controls";


import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { createMaintenanceRequestAction } from "@/lib/maintenance/actions";

type Structure = { id: string; name: string };
type Equipment = { id: string; identification: string; structure_id: string };

export function MaintenanceRequestForm({ structures, equipment }: { structures: Structure[]; equipment: Equipment[] }) {
  const [structureId, setStructureId] = useState("");
  const eligibleEquipment = useMemo(() => equipment.filter((item) => item.structure_id === structureId), [equipment, structureId]);
  return <form action={createMaintenanceRequestAction} className="cv-form cv-form-grid"><label>Área comum<ContentSelect name="structure_id" required value={structureId} onChange={(event) => setStructureId(event.target.value)}><option value="">Selecione</option>{structures.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</ContentSelect></label><label>Equipamento relacionado<ContentSelect name="equipment_id"><option value="">Opcional</option>{eligibleEquipment.map((item) => <option key={item.id} value={item.id}>{item.identification}</option>)}</ContentSelect></label><label className="cv-field-lg">Título<input name="title" required minLength={3} maxLength={180}/></label><label className="cv-form-wide">Descrição do problema<textarea name="description" required minLength={3} maxLength={10000} rows={5}/></label><div className="cv-form-wide" style={{ display: "flex", alignItems: "flex-end", gap: "12px", flexWrap: "wrap" }}><label style={{ width: "max-content", maxWidth: "100%", flex: "0 1 auto" }}>Prioridade<ContentSelect name="priority" defaultValue="medium"><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option><option value="emergency">Emergência</option></ContentSelect></label><div className="cv-form-actions"><Button type="submit" style={{ whiteSpace: "nowrap", minWidth: "190px", width: "auto", flexShrink: 0 }}>Registrar solicitação</Button></div></div></form>;
}
