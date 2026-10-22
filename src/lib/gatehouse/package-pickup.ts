import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Pickup codes for packages. A code is the package ID and an expiry date signed
 * with a server secret, so nothing is stored in the database. Retrieval also
 * requires the package to still be "received" (checked by the caller).
 */

const DEFAULT_VALIDITY_DAYS = 7;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PickupCodeCheck =
  | { valid: true; packageId: string }
  | { valid: false; reason: "malformed" | "bad_signature" | "expired" };

function sign(packageId: string, expiresAt: number, secret: string): string {
  return createHmac("sha256", secret).update(`${packageId}.${expiresAt}`).digest("base64url");
}

export function createPickupCode(
  packageId: string,
  secret: string,
  now: Date = new Date(),
  validityDays: number = DEFAULT_VALIDITY_DAYS
): string {
  if (!UUID_PATTERN.test(packageId)) throw new Error("ID de encomenda inválido.");
  if (secret.length < 32) throw new Error("Segredo de retirada muito curto.");
  const expiresAt = Math.floor(now.getTime() / 1000) + validityDays * 24 * 60 * 60;
  return `${packageId}.${expiresAt}.${sign(packageId, expiresAt, secret)}`;
}

export function verifyPickupCode(code: string, secret: string, now: Date = new Date()): PickupCodeCheck {
  const parts = code.trim().split(".");
  if (parts.length !== 3) return { valid: false, reason: "malformed" };
  const [packageId, expiresRaw, signature] = parts;
  if (!UUID_PATTERN.test(packageId) || !/^\d+$/.test(expiresRaw)) return { valid: false, reason: "malformed" };

  const expiresAt = Number(expiresRaw);
  const expected = Buffer.from(sign(packageId, expiresAt, secret));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return { valid: false, reason: "bad_signature" };
  }

  if (Math.floor(now.getTime() / 1000) >= expiresAt) return { valid: false, reason: "expired" };
  return { valid: true, packageId };
}

export function generateResidentPickupCode(
  packageId: string,
  status: string,
  secret: string | undefined,
  now: Date = new Date()
) {
  if (status !== "received") {
    throw new Error("Só é possível gerar código para encomendas recebidas.");
  }
  if (!secret) {
    throw new Error("O segredo de retirada (PACKAGE_PICKUP_SECRET) não está configurado no servidor.");
  }
  const code = createPickupCode(packageId, secret, now);
  const expiresAt = Number(code.split(".")[1]) * 1000;
  return { code, expiresAt: new Date(expiresAt).toISOString() };
}

/** Message shown to the doorman when a pickup code is refused. */
export function pickupRejectionMessage(reason: "malformed" | "bad_signature" | "expired"): string {
  if (reason === "expired") return "Este código de retirada já venceu. Peça ao morador para gerar um novo.";
  if (reason === "bad_signature") return "Código de retirada inválido.";
  return "Este código não é um código de retirada do CondoVia.";
}
