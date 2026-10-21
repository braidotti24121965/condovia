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
