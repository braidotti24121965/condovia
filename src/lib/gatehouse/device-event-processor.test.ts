import { describe, expect, it } from "vitest";
import { processDeviceEvent } from "./device-event-processor";
import type { EventContext } from "./device-events";
import { simulatedDenied, simulatedEvent } from "./device-simulator";

const context: EventContext = {
  deviceKnown: true,
  accessPointActive: true,
  alreadyRecorded: false,
  authorizationValid: true,
  matchesManualRecord: false,
  lastOccurredAt: null,
};

describe("processDeviceEvent", () => {
  it("produces a device record command without side effects", () => {
    const result = processDeviceEvent(simulatedEvent(), context);
    expect(result).toEqual({
      action: "record",
      command: expect.objectContaining({
        source: "device",
        deviceId: "dev-sim-1",
        externalEventId: "evt-0001",
        eventType: "entry",
        decision: "granted",
        outOfOrder: false,
      }),
    });
  });

  it("preserves denied events as commands", () => {
    const result = processDeviceEvent(simulatedDenied(), context);
    expect(result).toEqual({
      action: "record_denied",
      command: expect.objectContaining({ eventType: "denied", decision: "denied", denialReason: "autorização ausente" }),
    });
  });

  it("marks a granted event with invalid authorization as inconsistent", () => {
    const result = processDeviceEvent(simulatedEvent(), { ...context, authorizationValid: false });
    expect(result.action).toBe("record_inconsistent");
    expect(result).toHaveProperty("reason", "Liberado pelo equipamento com autorização vencida ou ausente.");
  });

  it("returns duplicate without producing a write command", () => {
    const result = processDeviceEvent(simulatedEvent(), { ...context, alreadyRecorded: true });
    expect(result).toEqual({ action: "duplicate", reason: "Evento já processado." });
  });

  it("rejects malformed payloads before classification", () => {
    const result = processDeviceEvent({ event_id: "missing-fields" }, context);
    expect(result).toEqual({ action: "invalid", reason: "device_id obrigatório." });
  });

  it("rejects unknown devices without a write command", () => {
    const result = processDeviceEvent(simulatedEvent(), { ...context, deviceKnown: false });
    expect(result).toEqual({ action: "reject", reason: "Equipamento não cadastrado." });
  });
});
