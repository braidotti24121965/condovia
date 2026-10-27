import {
  classifyDeviceEvent,
  parseDeviceEvent,
  type EventContext,
  type EventAction,
  type DeviceEvent,
} from "./device-events";

export type DeviceRecordCommand = {
  source: "device";
  deviceId: string;
  externalEventId: string;
  accessPointId: string;
  personId: string | null;
  attemptId: string | null;
  eventType: DeviceEvent["type"];
  occurredAt: string;
  decision: DeviceEvent["decision"];
  denialReason: string | null;
  recognitionMethod: DeviceEvent["recognitionMethod"];
  outOfOrder: boolean;
};

export type DeviceEventProcessingResult =
  | { action: "record" | "record_denied" | "record_inconsistent"; command: DeviceRecordCommand; reason?: string }
  | { action: "duplicate" | "reject"; reason: string }
  | { action: "invalid"; reason: string };

function commandFor(event: DeviceEvent, action: Extract<EventAction, { action: "record" | "record_denied" | "record_inconsistent" }>): DeviceRecordCommand {
  return {
    source: "device",
    deviceId: event.deviceId,
    externalEventId: event.eventId,
    accessPointId: event.accessPointId,
    personId: event.personId,
    attemptId: event.attemptId,
    eventType: event.type,
    occurredAt: event.occurredAt,
    decision: event.decision,
    denialReason: event.denialReason,
    recognitionMethod: event.recognitionMethod,
    outOfOrder: action.action === "record" ? action.outOfOrder : false,
  };
}

/**
 * Transforms a normalized equipment payload into a safe internal command.
 * It has no network/database side effects and never opens a gate.
 */
export function processDeviceEvent(raw: unknown, context: EventContext): DeviceEventProcessingResult {
  const parsed = parseDeviceEvent(raw);
  if (!parsed.ok) return { action: "invalid", reason: parsed.error };

  const action = classifyDeviceEvent(parsed.event, context);
  if (action.action === "record" || action.action === "record_denied" || action.action === "record_inconsistent") {
    return { action: action.action, command: commandFor(parsed.event, action), ...(action.action === "record_inconsistent" ? { reason: action.reason } : {}) };
  }
  return { action: action.action, reason: "reason" in action ? action.reason : "Evento já processado." };
}
