/**
 * Interface única para os equipamentos de controle de acesso. Cada fabricante ganha um adaptador
 * que traduz estas operações para o protocolo dele. Sem documentação do fabricante, só existe o
 * adaptador de simulação (ver device-adapter-simulated.ts).
 */

import type { DeviceEvent } from "./device-events";

export type AdapterError = { ok: false; error: string };
export type AdapterOk<T = undefined> = { ok: true; value: T };
export type AdapterResult<T = undefined> = AdapterOk<T> | AdapterError;

export type PersonRecord = {
  personId: string;
  /** Fotos e documentos só entram aqui depois da base legal e do consentimento (ver contrato). */
  faceTemplate: string | null;
  qrCode: string | null;
  validFrom: string;
  validUntil: string;
};

export type DeviceStatus = { online: boolean; firmware: string | null; checkedAt: string };

export interface DeviceAdapter {
  readonly deviceId: string;
  readonly manufacturer: string;
  readonly model: string;

  registerPerson(record: PersonRecord): Promise<AdapterResult>;
  removePerson(personId: string): Promise<AdapterResult>;
  status(): Promise<AdapterResult<DeviceStatus>>;
  /** Eventos ainda não entregues ao CondoVia, a partir de um marcador opaco. */
  fetchEvents(cursor: string | null): Promise<AdapterResult<{ events: DeviceEvent[]; cursor: string | null }>>;
}
