"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { ContentSelect } from "@/components/ui/form-controls";
import { createSimulationDevice, recordSimulation } from "@/lib/gatehouse/simulation-actions";

export type SimulationOption = { id: string; label: string };
export function SimulationForm({ devices, authorizations }: { devices: SimulationOption[]; authorizations: SimulationOption[] }) {
  const [state, action, pending] = useActionState(recordSimulation, {});
  const [externalId, setExternalId] = useState("");
  const [device, setDevice] = useState("");
  const [authorization, setAuthorization] = useState("");
  const [event, setEvent] = useState("entry");
  return <form action={action} className="cv-form">
    <div className="cv-form-actions">
      <label>Equipamento<ContentSelect name="device" required value={device} onChange={e => setDevice(e.target.value)}><option value="">Selecione o equipamento</option>{devices.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}</ContentSelect></label>
      <label>Autorização<ContentSelect name="authorization" required value={authorization} onChange={e => setAuthorization(e.target.value)}><option value="">Selecione a autorização</option>{authorizations.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}</ContentSelect></label>
      <label>Evento<ContentSelect name="event" value={event} onChange={e => setEvent(e.target.value)}><option value="entry">Entrada liberada</option><option value="exit">Saída liberada</option><option value="denied">Acesso negado</option></ContentSelect></label>
    </div>
    <label>Identificador do evento<input style={{ width: "36ch", maxWidth: "100%" }} name="externalId" required maxLength={100} value={externalId} onChange={e => setExternalId(e.target.value)} placeholder="Ex.: teste-entrada-001" /></label>
    <p>Reenvie o mesmo identificador com o mesmo equipamento para testar duplicidade. Use outro identificador para um novo evento. O horário é o momento do envio.</p>
    <div className="cv-form-actions"><Button type="button" variant="secondary" disabled={pending} onClick={() => setExternalId(crypto.randomUUID())}>Gerar identificador</Button><Button type="submit" disabled={pending || !devices.length || !authorizations.length}>{pending ? "Registrando..." : "Registrar simulação"}</Button></div>
    {state.error && <p className="cv-field-error" role="alert">{state.error}</p>}
    {state.success && <p role="status">{state.success}</p>}
  </form>;
}

export function SimulationDeviceForm({ points }: { points: SimulationOption[] }) {
  const [state, action, pending] = useActionState(createSimulationDevice, {});
  return <form className="cv-form" action={action}>
    <label>Ponto de acesso<ContentSelect name="point" required defaultValue=""><option value="">Selecione o ponto ativo</option>{points.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</ContentSelect></label>
    <div className="cv-form-actions"><Button type="submit" disabled={pending || !points.length}>{pending ? "Criando..." : "Cadastrar simulador"}</Button></div>
    {state.error && <p role="alert" className="cv-field-error">{state.error}</p>}
    {state.success && <p role="status">{state.success}</p>}
  </form>;
}
