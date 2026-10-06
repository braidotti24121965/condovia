import { describe, expect, it } from "vitest";
import { formatReservationSchedule, reservationErrorMessage, reservationStatusLabels } from "./reservation-presenters";

describe("reservation presentation", () => {
  it("maps reservation statuses to Portuguese labels", () => {
    expect(reservationStatusLabels).toEqual({ pending: "Pendente", approved: "Aprovada", rejected: "Rejeitada", cancelled: "Cancelada" });
  });
  it("shows DAY reservations as full day and preserves time slots", () => {
    expect(formatReservationSchedule("day", "2026-10-07T11:00:00Z", "2026-10-07T21:00:00Z", "America/Sao_Paulo")).toBe("Dia inteiro");
    expect(formatReservationSchedule("time_slot", "2026-10-10T17:00:00Z", "2026-10-10T21:00:00Z", "America/Sao_Paulo")).toBe("14:00–18:00");
  });
  it("maps reservation validation errors to specific friendly messages", () => {
    expect(reservationErrorMessage(new Error("A reserva não pode começar no passado."))).toBe("Não é possível realizar uma reserva para uma data ou horário anterior ao momento atual.");
    expect(reservationErrorMessage(new Error("O horário de término deve ser posterior ao horário de início."))).toBe("O horário de término deve ser posterior ao horário de início.");
    expect(reservationErrorMessage(new Error("Esta reserva precisa ser solicitada com maior antecedência."))).toBe("Esta reserva precisa ser solicitada com maior antecedência.");
    expect(reservationErrorMessage(new Error("Esta reserva está muito distante. O recurso permite agendamentos com até 7 dias de antecedência."))).toContain("até 7 dias");
    expect(reservationErrorMessage(new Error("A reserva deve ter duração mínima de 1 hora."))).toBe("A reserva deve ter duração mínima de 1 hora.");
    expect(reservationErrorMessage(new Error("A reserva pode ter duração máxima de 4 horas."))).toBe("A reserva pode ter duração máxima de 4 horas.");
    expect(reservationErrorMessage(new Error("O horário selecionado está fora do período de disponibilidade deste recurso."))).toBe("O horário selecionado está fora do período de disponibilidade deste recurso.");
    expect(reservationErrorMessage(new Error("Já existe uma reserva nesse período."))).toBe("Já existe uma reserva nesse período.");
  });
});
