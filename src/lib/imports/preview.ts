import type { ImportRow } from "./types";

export type PersistedImportRow = { row_number: number; classification: ImportRow["classification"]; normalized_data: Record<string, string>; message: string | null };

export function restorePreviewRows(rows: PersistedImportRow[]): ImportRow[] {
  return rows.map((row) => ({ rowNumber: row.row_number, classification: row.classification, data: row.normalized_data, message: row.message || undefined }));
}
