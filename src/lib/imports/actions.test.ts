import { describe, expect, it } from "vitest";
import { restorePreviewRows } from "./actions";

describe("retomada de prévia de importação", () => {
  it("restaura classificação, dados e mensagens das linhas persistidas", () => {
    expect(restorePreviewRows([
      { row_number: 2, classification: "new", normalized_data: { name: "Bloco A" }, message: null },
      { row_number: 3, classification: "duplicate", normalized_data: { name: "Bloco B" }, message: "Registro já existe no condomínio." },
      { row_number: 4, classification: "invalid", normalized_data: { name: "" }, message: "Campos obrigatórios ausentes." },
    ])).toEqual([
      { rowNumber: 2, classification: "new", data: { name: "Bloco A" }, message: undefined },
      { rowNumber: 3, classification: "duplicate", data: { name: "Bloco B" }, message: "Registro já existe no condomínio." },
      { rowNumber: 4, classification: "invalid", data: { name: "" }, message: "Campos obrigatórios ausentes." },
    ]);
  });
});
