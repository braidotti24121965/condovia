/**
 * Eventos vindos de equipamentos de controle de acesso, no formato interno descrito em
 * docs/condovia/contrato-acesso-facial.md. Esta camada não chama equipamentos nem grava nada:
 * valida o evento e decide o que o sistema deve fazer com ele.
 */

export type DeviceEventType = "entry" | "exit" | "denied";
export type DeviceDecision = "granted" | "denied" | "unknown";
export type RecognitionMethod = "face" | "card" | "qr" | "password" | "other";

export type DeviceEvent = {
  eventId: string;
  deviceId: string;
  type: DeviceEventType;
  occurredAt: string;
  accessPointId: string;
  personId: string | null;
  attemptId: string | null;
  decision: DeviceDecision;
  denialReason: string | null;
  recognitionMethod: RecognitionMethod;
};

export type ParseResult = { ok: true; event: DeviceEvent } | { ok: false; error: string };

const TYPES: DeviceEventType[] = ["entry", "exit", "denied"];
const DECISIONS: DeviceDecision[] = ["granted", "denied", "unknown"];
const METHODS: RecognitionMethod[] = ["face", "card", "qr", "password", "other"];

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Converte o JSON recebido do equipamento. Campos obrigatórios ausentes ou inválidos viram erro. */
export function parseDeviceEvent(raw: unknown): ParseResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Evento inválido." };
  const r = raw as Record<string, unknown>;

  const eventId = text(r.event_id);
  const deviceId = text(r.device_id);
  const accessPointId = text(r.access_point_id);
  const occurredAt = text(r.occurred_at);
  const type = r.event_type as DeviceEventType;
  const decision = r.decision as DeviceDecision;
  const method = r.recognition_method as RecognitionMethod;

  if (!eventId) return { ok: false, error: "event_id obrigatório." };
  if (!deviceId) return { ok: false, error: "device_id obrigatório." };
  if (!accessPointId) return { ok: false, error: "access_point_id obrigatório." };
  if (!occurredAt || Number.isNaN(Date.parse(occurredAt))) return { ok: false, error: "occurred_at deve ser uma data ISO 8601." };
  if (!TYPES.includes(type)) return { ok: false, error: "event_type inválido." };
  if (!DECISIONS.includes(decision)) return { ok: false, error: "decision inválida." };
  if (!METHODS.includes(method)) return { ok: false, error: "recognition_method inválido." };

  const personId = text(r.person_id);
  const attemptId = text(r.attempt_id);
  if (!personId && !attemptId) return { ok: false, error: "Informe person_id ou attempt_id." };

  return {
    ok: true,
    event: {
      eventId,
      deviceId,
      type,
      occurredAt,
      accessPointId,
      personId,
      attemptId,
      decision,
      denialReason: text(r.denial_reason),
      recognitionMethod: method,
    },
  };
}

/** O que o sistema sabe no momento em que recebe o evento. */
export type EventContext = {
  deviceKnown: boolean;
  accessPointActive: boolean;
  /** Já existe registro com o mesmo device_id e event_id. */
  alreadyRecorded: boolean;
  /** true/false quando há pessoa identificada; null quando não há. */
  authorizationValid: boolean | null;
  /** Registro manual de entrada/saída da mesma pessoa, no mesmo ponto, na janela de reenvio. */
  matchesManualRecord: boolean;
  /** Horário do último evento já gravado para este equipamento, para detectar fora de ordem. */
  lastOccurredAt: string | null;
};

export type EventAction =
  | { action: "record"; outOfOrder: boolean }
  | { action: "record_denied" }
  | { action: "record_inconsistent"; reason: string }
  | { action: "duplicate" }
  | { action: "reject"; reason: string };

/** Decide o que fazer com um evento já validado. Nunca libera acesso: só registra o que o equipamento informou. */
export function classifyDeviceEvent(event: DeviceEvent, context: EventContext): EventAction {
  if (!context.deviceKnown) return { action: "reject", reason: "Equipamento não cadastrado." };
  if (!context.accessPointActive) return { action: "reject", reason: "Ponto de acesso inativo ou inexistente." };
  if (context.alreadyRecorded) return { action: "duplicate" };
  if (context.matchesManualRecord) return { action: "duplicate" };

  if (event.type === "denied" || event.decision === "denied") return { action: "record_denied" };

  if (event.decision === "unknown") return { action: "reject", reason: "Decisão desconhecida do equipamento." };

  // O equipamento liberou. Se a autorização não confere, o registro sai como inconsistente
  // e a portaria é avisada; o sistema não desfaz a liberação, porque a porta já abriu.
  if (context.authorizationValid === false) {
    return { action: "record_inconsistent", reason: "Liberado pelo equipamento com autorização vencida ou ausente." };
  }

  const outOfOrder = context.lastOccurredAt !== null && Date.parse(event.occurredAt) < Date.parse(context.lastOccurredAt);
  return { action: "record", outOfOrder };
}
