import { describe, expect, it } from "vitest";
import { classifyDeviceEvent, parseDeviceEvent, type EventContext } from "./device-events";
import { simulatedDenied, simulatedEvent, simulatedRetransmission, simulatedUnknownAttempt } from "./device-simulator";

const ok: EventContext = {
  deviceKnown: true,
  accessPointActive: true,
  alreadyRecorded: false,
  authorizationValid: true,
  matchesManualRecord: false,
  lastOccurredAt: null,
};

function parsed(raw: Record<string, unknown>) {
  const result = parseDeviceEvent(raw);
  if (!result.ok) throw new Error(result.error);
  return result.event;
}

describe("parseDeviceEvent", () => {
  it("accepts a valid entry", () => {
    expect(parseDeviceEvent(simulatedEvent()).ok).toBe(true);
  });

  it("rejects an event without identification (no person_id and no attempt_id)", () => {
    const result = parseDeviceEvent(simulatedEvent({ person_id: null, attempt_id: null }));
    expect(result).toEqual({ ok: false, error: "Informe person_id ou attempt_id." });
  });

  it("rejects an invalid timestamp", () => {
    expect(parseDeviceEvent(simulatedEvent({ occurred_at: "ontem" })).ok).toBe(false);
  });

  it("rejects an unknown event type and an unknown recognition method", () => {
    expect(parseDeviceEvent(simulatedEvent({ event_type: "pass" })).ok).toBe(false);
    expect(parseDeviceEvent(simulatedEvent({ recognition_method: "voice" })).ok).toBe(false);
  });
});

describe("classifyDeviceEvent: casos do desenho", () => {
  it("1. entrada válida é registrada", () => {
    expect(classifyDeviceEvent(parsed(simulatedEvent()), ok)).toEqual({ action: "record", outOfOrder: false });
  });

  it("2. entrada liberada com autorização vencida é registrada como inconsistente, sem desfazer a liberação", () => {
    const action = classifyDeviceEvent(parsed(simulatedEvent()), { ...ok, authorizationValid: false });
    expect(action.action).toBe("record_inconsistent");
  });

  it("3. tentativa negada com pessoa identificada é registrada como negada", () => {
    expect(classifyDeviceEvent(parsed(simulatedDenied()), ok)).toEqual({ action: "record_denied" });
  });

  it("4. tentativa negada sem identificação é registrada sem inventar identidade", () => {
    const event = parsed(simulatedUnknownAttempt());
    expect(event.personId).toBeNull();
    expect(event.attemptId).toBe("tentativa-1");
    expect(classifyDeviceEvent(event, ok)).toEqual({ action: "record_denied" });
  });

  it("5. o mesmo evento reenviado não duplica o registro", () => {
    const original = simulatedEvent();
    const retransmitted = parsed(simulatedRetransmission(original));
    expect(classifyDeviceEvent(retransmitted, { ...ok, alreadyRecorded: true })).toEqual({ action: "duplicate" });
  });

  it("6. evento que chega depois de um registro manual da mesma pessoa é tratado como duplicata", () => {
    expect(classifyDeviceEvent(parsed(simulatedEvent()), { ...ok, matchesManualRecord: true })).toEqual({ action: "duplicate" });
  });

  it("7. equipamento desconhecido é rejeitado", () => {
    expect(classifyDeviceEvent(parsed(simulatedEvent()), { ...ok, deviceKnown: false }).action).toBe("reject");
  });

  it("evento em ponto inativo é rejeitado", () => {
    expect(classifyDeviceEvent(parsed(simulatedEvent()), { ...ok, accessPointActive: false }).action).toBe("reject");
  });

  it("evento com horário anterior ao último gravado é registrado, marcado como fora de ordem", () => {
    const action = classifyDeviceEvent(parsed(simulatedEvent({ occurred_at: "2026-10-23T09:00:00-03:00" })), {
      ...ok,
      lastOccurredAt: "2026-10-23T10:00:00-03:00",
    });
    expect(action).toEqual({ action: "record", outOfOrder: true });
  });

  it("nunca decide liberar: uma negação do equipamento permanece negada mesmo com autorização válida", () => {
    const action = classifyDeviceEvent(parsed(simulatedDenied()), { ...ok, authorizationValid: true });
    expect(action).toEqual({ action: "record_denied" });
  });
});
