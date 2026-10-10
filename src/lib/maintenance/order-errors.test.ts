import { describe, expect, it } from "vitest";
import { orderTransitionError } from "./order-errors";

describe("OS transition errors", () => {
  it("identifies the checklist blocker with a recovery instruction", () => {
    expect(orderTransitionError("Checklist obrigatório incompleto", "submit_validation")).toContain("Conclua e salve todos os itens obrigatórios");
  });
  it("distinguishes technical prerequisites from cancellation reasons", () => {
    const message = "Transição inválida ou motivo ausente";
    expect(orderTransitionError(message, "submit_validation")).toContain("atividades executadas e a conclusão técnica");
    expect(orderTransitionError(message, "cancel")).toContain("motivo com pelo menos 3 caracteres");
  });
  it("does not disclose unexpected database errors", () => {
    expect(orderTransitionError('relation private_table does not exist', "start")).toBe("Não foi possível atualizar a ordem de serviço. Tente novamente.");
  });
});
