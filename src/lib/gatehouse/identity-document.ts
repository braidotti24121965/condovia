export const IDENTITY_DOCUMENT_TYPES = ["cpf", "rg", "cnh", "passport"] as const;
export type IdentityDocumentType = (typeof IDENTITY_DOCUMENT_TYPES)[number];

export function isIdentityDocumentType(value: string): value is IdentityDocumentType {
  return (IDENTITY_DOCUMENT_TYPES as readonly string[]).includes(value);
}

/** Validates a Brazilian CPF using its two check digits. */
export function isValidCpf(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;

  for (let length = 9; length <= 10; length++) {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(digits[i]) * (length + 1 - i);
    const check = (sum * 10) % 11 % 10;
    if (check !== Number(digits[length])) return false;
  }
  return true;
}

/**
 * Checks the document number for the given type.
 * CPF must pass the check digits; RG, CNH and passport need at least 4 letters or digits.
 */
export function validateIdentityDocument(type: IdentityDocumentType, value: string): string | null {
  const trimmed = value.trim();
  if (type === "cpf") {
    return isValidCpf(trimmed) ? null : "CPF inválido. Confira os 11 dígitos.";
  }
  const compact = trimmed.replace(/[^A-Za-z0-9]/g, "");
  if (compact.length < 4) return "Número do documento incompleto.";
  return null;
}

/** Normalizes a vehicle plate to uppercase letters and digits, with no hyphen. */
export function normalizePlate(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

/** Accepts Mercosul (ABC1D23) and legacy (ABC1234) plates. */
export function isValidPlate(value: string): boolean {
  return /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(normalizePlate(value));
}
