/**
 * Reads the list of lots in good standing sent by the condominium administrator before an assembly.
 * Expected format: one lot code per line, optionally with a header row "lote" or "unidade".
 * Blank lines and duplicates are ignored. Lots are matched by code, case-insensitive, without spaces.
 */

export type LotsParseResult = {
  codes: string[];
  invalid: string[];
};

const HEADERS = new Set(["lote", "unidade", "codigo", "código"]);

export function parseLotsInGoodStanding(text: string): LotsParseResult {
  const codes = new Set<string>();
  const invalid: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const cell = raw.split(/[;,]/)[0].trim();
    if (!cell) continue;
    if (HEADERS.has(cell.toLowerCase())) continue;
    const normalized = cell.replace(/\s+/g, "").toUpperCase();
    if (!/^[A-Z0-9-]{1,20}$/.test(normalized)) {
      invalid.push(cell);
      continue;
    }
    codes.add(normalized);
  }
  return { codes: [...codes].sort(), invalid };
}

/** Units eligible to vote: those whose code is on the list of lots in good standing. */
export function eligibleUnits<T extends { code: string }>(units: T[], goodStanding: string[]): T[] {
  const allowed = new Set(goodStanding.map((code) => code.replace(/\s+/g, "").toUpperCase()));
  return units.filter((unit) => allowed.has(unit.code.replace(/\s+/g, "").toUpperCase()));
}
