export const validUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function parseMoney(value: string): number {
  const amount = Number(value || "0");
  if (!Number.isFinite(amount) || amount < 0 || amount > 999999999999.99) throw new Error("Valor monetário inválido");
  return Math.round(amount * 100) / 100;
}
export const fileRules = { maxBytes: 10 * 1024 * 1024, mimeTypes: ["application/pdf", "image/jpeg", "image/png", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"] };
export const documentKinds: Record<string, string> = { contract: "Contrato", proposal: "Proposta", invoice: "Nota fiscal", report: "Laudo/relatório", certificate: "Certificado", warranty: "Garantia", receipt: "Comprovante", photo: "Foto", other: "Outro" };
export const maintenanceKinds: Record<string, string> = { corrective: "Corretiva", preventive: "Preventiva", inspection: "Inspeção", improvement: "Melhoria" };
export const money = (value: number | string | null) => Number(value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const civilDate = (value: string | null) => value ? value.slice(0, 10).split("-").reverse().join("/") : "—";
