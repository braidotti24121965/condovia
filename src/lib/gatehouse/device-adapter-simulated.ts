import type { AdapterResult, DeviceAdapter, DeviceStatus, PersonRecord } from "./device-adapter";
import type { DeviceEvent } from "./device-events";

/**
 * Adaptador de simulação: guarda o estado em memória e entrega os eventos que foram empilhados.
 * Não se conecta a nenhum aparelho.
 */
export class SimulatedDeviceAdapter implements DeviceAdapter {
  readonly manufacturer = "Simulação";
  readonly model = "Simulador";
  private people = new Map<string, PersonRecord>();
  private queue: DeviceEvent[] = [];
  private online = true;

  constructor(readonly deviceId: string) {}

  /** Controle do teste: simula queda e volta da conexão. */
  setOnline(value: boolean) {
    this.online = value;
  }

  /** Controle do teste: coloca eventos na fila do equipamento. */
  pushEvent(event: DeviceEvent) {
    this.queue.push(event);
  }

  async registerPerson(record: PersonRecord): Promise<AdapterResult> {
    if (!this.online) return { ok: false, error: "Equipamento offline." };
    if (record.validUntil < record.validFrom) return { ok: false, error: "Validade inválida." };
    this.people.set(record.personId, record);
    return { ok: true, value: undefined };
  }

  async removePerson(personId: string): Promise<AdapterResult> {
    if (!this.online) return { ok: false, error: "Equipamento offline." };
    this.people.delete(personId);
    return { ok: true, value: undefined };
  }

  async status(): Promise<AdapterResult<DeviceStatus>> {
    return { ok: true, value: { online: this.online, firmware: null, checkedAt: new Date().toISOString() } };
  }

  /**
   * Entrega os eventos em ordem de chegada. O cursor é o número de eventos já entregues, então
   * uma nova chamada com o mesmo cursor não repete eventos.
   */
  async fetchEvents(cursor: string | null): Promise<AdapterResult<{ events: DeviceEvent[]; cursor: string | null }>> {
    if (!this.online) return { ok: false, error: "Equipamento offline." };
    const start = cursor === null ? 0 : Number(cursor);
    if (!Number.isInteger(start) || start < 0) return { ok: false, error: "Cursor inválido." };
    const events = this.queue.slice(start);
    return { ok: true, value: { events, cursor: String(this.queue.length) } };
  }

  /** Controle do teste: quantas pessoas estão cadastradas no equipamento. */
  registeredCount() {
    return this.people.size;
  }
}
