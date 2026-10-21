import { describe, expect, it } from "vitest";
import { buildPackageLabelNote, extractDceKey, extractDceKeyFromNotes, packageDescriptionFor } from "./package-label";

const KEY = "35261002351877001396990020086551841109797520";
const DCE_URL = `https://www.fazenda.pr.gov.br/dce/qrcode?chDCe=${KEY}&tpAmb=1`;

describe("extractDceKey", () => {
  it("reads the access key from the DC-e QR link", () => {
    expect(extractDceKey(DCE_URL)).toBe(KEY);
  });

  it("returns null for text that is not a DC-e link", () => {
    expect(extractDceKey("SOD 352-19 990")).toBeNull();
    expect(extractDceKey("https://example.test/rastreio?codigo=123")).toBeNull();
    expect(extractDceKey(`https://www.fazenda.pr.gov.br/dce/qrcode?chDCe=123&tpAmb=1`)).toBeNull();
  });
});

describe("buildPackageLabelNote", () => {
  it("stores the DC-e key in the observations", () => {
    expect(buildPackageLabelNote(DCE_URL)).toBe(`Chave DC-e: ${KEY}`);
  });

  it("stores other label text as the label code, trimmed", () => {
    expect(buildPackageLabelNote("  SOD 352-19 990  ")).toBe("Código da etiqueta: SOD 352-19 990");
  });
});

describe("extractDceKeyFromNotes", () => {
  it("reads the key from the observations saved by the form", () => {
    expect(extractDceKeyFromNotes(`Chave DC-e: ${KEY}`)).toBe(KEY);
  });

  it("returns null when there is no key", () => {
    expect(extractDceKeyFromNotes("Código da etiqueta: SOD 352-19 990")).toBeNull();
    expect(extractDceKeyFromNotes(null)).toBeNull();
  });
});

describe("packageDescriptionFor", () => {
  it("keeps the typed description", () => {
    expect(packageDescriptionFor("Caixa média", "Correios")).toBe("Caixa média");
  });

  it("uses the carrier when the description is empty", () => {
    expect(packageDescriptionFor("  ", "J&T Express")).toBe("Encomenda J&T Express");
  });

  it("uses a generic label when both are empty", () => {
    expect(packageDescriptionFor("", null)).toBe("Encomenda");
  });
});
