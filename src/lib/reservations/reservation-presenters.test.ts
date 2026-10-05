import { describe, expect, it } from "vitest";
import { reservationErrorMessage, reservationStatusLabels } from "./reservation-presenters";

describe("reservation presentation", () => {
  it("maps reservation statuses to Portuguese labels", () => {
    expect(reservationStatusLabels).toEqual({ pending: "Pendente", approved: "Aprovada", rejected: "Rejeitada", cancelled: "Cancelada" });
  });
  it("maps expected conflict errors to a friendly message", () => {
    expect(reservationErrorMessage(new Error("Já existe uma reserva nesse período."))).toBe("Já existe uma reserva nesse período.");
  });
});
