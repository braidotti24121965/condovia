/**
 * Extracts the access key of a Brazilian electronic declaration (DC-e) from the
 * QR Code printed on a shipping label. The QR links to the state portal with the
 * 44-digit key in the `chDCe` parameter. Returns null for any other text.
 */
export function extractDceKey(text: string): string | null {
  try {
    const key = new URL(text.trim()).searchParams.get("chDCe");
    return key && /^\d{44}$/.test(key) ? key : null;
  } catch {
    return null;
  }
}

/**
 * Builds the observation text stored with the package from a label QR Code.
 * The package form keeps this in the existing notes field, so no schema change is needed.
 */
export function buildPackageLabelNote(text: string): string {
  const key = extractDceKey(text);
  if (key) return `Chave DC-e: ${key}`;
  return `Código da etiqueta: ${text.trim().slice(0, 200)}`;
}

/** Extracts the DC-e key from the observations saved by the receiving form. */
export function extractDceKeyFromNotes(notes: string | null): string | null {
  const match = notes?.match(/Chave DC-e: (\d{44})/);
  return match ? match[1] : null;
}

/** Carriers offered in the receiving form. A select keeps the names consistent across records. */
export const packageCarrierOptions = [
  "Correios",
  "J&T Express",
  "Mercado Livre",
  "Amazon",
  "Shopee",
  "Magalu",
  "Loggi",
  "Motoboy",
  "Outra",
] as const;

/** Description used when the porteiro leaves it empty: the carrier, or a generic label. */
export function packageDescriptionFor(description: string, carrier: string | null): string {
  const typed = description.trim();
  if (typed.length >= 2) return typed;
  return carrier ? `Encomenda ${carrier}` : "Encomenda";
}
