/**
 * Simulador de equipamento: gera eventos no formato interno (ver device-events.ts).
 * Serve para testar o fluxo sem nenhum aparelho real. Não envia nada a lugar algum.
 */

export type SimulatedEventInput = Partial<Record<string, unknown>>;

/** Evento válido de entrada liberada por face. Os campos podem ser sobrescritos em cada teste. */
export function simulatedEvent(overrides: SimulatedEventInput = {}): Record<string, unknown> {
  return {
    event_id: "evt-0001",
    device_id: "dev-sim-1",
    event_type: "entry",
    occurred_at: "2026-10-23T10:00:00-03:00",
    access_point_id: "ponto-sim-1",
    person_id: "pessoa-sim-1",
    attempt_id: null,
    decision: "granted",
    denial_reason: null,
    recognition_method: "face",
    ...overrides,
  };
}

/** Tentativa negada com pessoa identificada, como autorização ausente. */
export function simulatedDenied(overrides: SimulatedEventInput = {}) {
  return simulatedEvent({
    event_id: "evt-denied-1",
    event_type: "denied",
    decision: "denied",
    denial_reason: "autorização ausente",
    ...overrides,
  });
}

/** Tentativa negada sem identificação: usa attempt_id e person_id nulo, sem inventar identidade. */
export function simulatedUnknownAttempt(overrides: SimulatedEventInput = {}) {
  return simulatedDenied({
    event_id: "evt-unknown-1",
    person_id: null,
    attempt_id: "tentativa-1",
    denial_reason: "pessoa desconhecida",
    ...overrides,
  });
}

/** Mesmo evento repetido, com o mesmo event_id, como acontece no reenvio após queda de rede. */
export function simulatedRetransmission(original: Record<string, unknown>) {
  return { ...original };
}
