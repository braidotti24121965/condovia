import { describe, expect, it } from "vitest";
import type { PersonRecord } from "./device-adapter";
import { SimulatedDeviceAdapter } from "./device-adapter-simulated";
import { parseDeviceEvent } from "./device-events";
import { simulatedEvent } from "./device-simulator";

const person: PersonRecord = {
  personId: "pessoa-1",
  faceTemplate: null,
  qrCode: "qr-1",
  validFrom: "2026-10-23",
  validUntil: "2026-12-31",
};

function event(id: string) {
  const parsed = parseDeviceEvent(simulatedEvent({ event_id: id }));
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.event;
}

describe("SimulatedDeviceAdapter", () => {
  it("registra e remove pessoas", async () => {
    const device = new SimulatedDeviceAdapter("dev-1");
    expect(await device.registerPerson(person)).toEqual({ ok: true, value: undefined });
    expect(device.registeredCount()).toBe(1);
    await device.removePerson("pessoa-1");
    expect(device.registeredCount()).toBe(0);
  });

  it("rejeita validade que termina antes de começar", async () => {
    const device = new SimulatedDeviceAdapter("dev-1");
    const result = await device.registerPerson({ ...person, validUntil: "2026-01-01" });
    expect(result).toEqual({ ok: false, error: "Validade inválida." });
  });

  it("não cadastra nem entrega eventos quando offline", async () => {
    const device = new SimulatedDeviceAdapter("dev-1");
    device.setOnline(false);
    expect((await device.registerPerson(person)).ok).toBe(false);
    expect((await device.fetchEvents(null)).ok).toBe(false);
    expect(device.registeredCount()).toBe(0);
  });

  it("entrega eventos em ordem e não repete com o cursor", async () => {
    const device = new SimulatedDeviceAdapter("dev-1");
    device.pushEvent(event("evt-1"));
    device.pushEvent(event("evt-2"));

    const first = await device.fetchEvents(null);
    expect(first.ok && first.value.events.map((e) => e.eventId)).toEqual(["evt-1", "evt-2"]);
    const cursor = first.ok ? first.value.cursor : null;

    device.pushEvent(event("evt-3"));
    const second = await device.fetchEvents(cursor);
    expect(second.ok && second.value.events.map((e) => e.eventId)).toEqual(["evt-3"]);
  });

  it("rejeita cursor inválido", async () => {
    const device = new SimulatedDeviceAdapter("dev-1");
    expect((await device.fetchEvents("abc")).ok).toBe(false);
    expect((await device.fetchEvents("-1")).ok).toBe(false);
  });

  it("status informa a conexão", async () => {
    const device = new SimulatedDeviceAdapter("dev-1");
    device.setOnline(false);
    const status = await device.status();
    expect(status.ok && status.value.online).toBe(false);
  });
});
