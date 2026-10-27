"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { isAccessSimulationEnabled } from "./simulation";
import { processDeviceEvent } from "./device-event-processor";
import { simulatedEvent } from "./device-simulator";

export type SimulationState = { error?: string; success?: string };
const inputSchema = z.object({
  device: z.uuid(), authorization: z.uuid(), event: z.enum(["entry", "exit", "denied"]),
  externalId: z.string().trim().min(1).max(100),
});

export async function recordSimulation(_previous: SimulationState, form: FormData): Promise<SimulationState> {
  if (!isAccessSimulationEnabled()) return { error: "Simulação disponível somente em homologação." };
  const { supabase, context } = await requireCondominiumPermission("structures.manage");
  const parsed = inputSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Selecione equipamento, autorização, tipo e identificador do evento." };
  const { device, authorization, event, externalId } = parsed.data;
  const [{ data: equipment, error: deviceError }, { data: permit, error: permitError }] = await Promise.all([
    supabase.from("access_devices").select("id, access_point_id, status").eq("id", device).eq("condominium_id", context.id).maybeSingle(),
    supabase.from("access_authorizations").select("id, visitor_id, service_provider_id, status, valid_from, valid_until").eq("id", authorization).eq("condominium_id", context.id).maybeSingle(),
  ]);
  if (deviceError || permitError || !equipment || !permit) return { error: "Equipamento ou autorização indisponível neste condomínio." };
  const occurredAt = new Date().toISOString();
  const result = processDeviceEvent(simulatedEvent({
    event_id: externalId, device_id: device, access_point_id: equipment.access_point_id,
    person_id: permit.visitor_id ?? permit.service_provider_id, event_type: event,
    occurred_at: occurredAt, decision: event === "denied" ? "denied" : "granted", recognition_method: "other",
  }), {
    deviceKnown: equipment.status === "active", accessPointActive: true, alreadyRecorded: false,
    authorizationValid: permit.status === "approved" && Date.parse(occurredAt) >= Date.parse(permit.valid_from) && Date.parse(occurredAt) <= Date.parse(permit.valid_until),
    matchesManualRecord: false, lastOccurredAt: null,
  });
  if (result.action === "invalid" || result.action === "reject") return { error: result.reason };
  // The RPC repeats all checks under transaction locks; no browser-provided classification is trusted.
  const { data, error } = await supabase.rpc("record_access_simulation", {
    p_condominium_id: context.id, p_device_id: device, p_authorization_id: authorization,
    p_external_event_id: externalId, p_event_type: event, p_occurred_at: occurredAt,
  });
  if (error) {
    console.error("[gatehouse] simulation failed", { code: error.code });
    return { error: "Não foi possível registrar a simulação. Confira as permissões e o equipamento ou contate o responsável pelo sistema." };
  }
  revalidatePath("/app/gatehouse/simulation");
  revalidatePath("/app/gatehouse/history");
  revalidatePath("/app/gatehouse/access");
  const messages: Record<string, string> = {
    duplicate: "Evento repetido: nenhum novo acesso foi gravado.",
    record_denied: "Negação simulada registrada. A presença não foi alterada.",
    record_inconsistent: "Acesso simulado registrado como inconsistente: autorização vencida ou não aprovada.",
    record: "Acesso simulado registrado. Confira o histórico e a presença da portaria.",
  };
  return { success: messages[data?.action] ?? "Simulação concluída." };
}

export async function createSimulationDevice(_previous: SimulationState, form: FormData): Promise<SimulationState> {
  if (!isAccessSimulationEnabled()) return { error: "Simulação disponível somente em homologação." };
  const { supabase, context } = await requireCondominiumPermission("structures.manage");
  const point = z.uuid().safeParse(form.get("point"));
  if (!point.success) return { error: "Selecione um ponto de acesso ativo." };
  const { error } = await supabase.rpc("create_access_simulation_device", { p_condominium_id: context.id, p_access_point_id: point.data });
  if (error) return { error: "Não foi possível criar o simulador. Confira o ponto de acesso ou contate o responsável pelo sistema." };
  revalidatePath("/app/gatehouse/simulation");
  return { success: "Simulador cadastrado. Selecione-o no formulário de evento." };
}
