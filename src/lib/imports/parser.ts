import { createHash } from "node:crypto";
import type { ImportEntity, ImportRow } from "./types";
export const MAX_ROWS = 2000; export const MAX_BYTES = 10 * 1024 * 1024;
export function fileHash(bytes: Uint8Array) { return createHash("sha256").update(bytes).digest("hex"); }
function clean(value: unknown) { return String(value ?? "").trim(); }
function csvRows(text: string): { rows: string[][]; structuralError?: string } {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false;
  for (let i=0;i<text.length;i++) { const c=text[i], n=text[i+1]; if(c==='"' && quoted && n==='"'){cell+='"';i++;} else if(c==='"'){quoted=!quoted;} else if(!quoted && (c===',' || c===';' || c==='\t')){row.push(cell);cell="";} else if(!quoted && (c==='\n' || c==='\r')){if(c==='\r'&&n==='\n')i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell="";} else cell+=c; }
  if(quoted) return { rows, structuralError: "CSV malformado: aspas não fechadas." };
  if(cell || row.length){row.push(cell);if(row.some(Boolean))rows.push(row);}
  if(rows.length && rows.some((item) => item.length !== rows[0].length)) return { rows, structuralError: "CSV malformado: linhas com quantidade diferente de colunas." };
  return { rows };
}
export function readTabularFile(bytes: Uint8Array): string[][] {
  let text: string;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { throw new Error("O arquivo não contém texto UTF-8 válido."); }
  if(text.includes("\u0000") || [...text].some((char) => char.charCodeAt(0) < 9 && char !== "\n" && char !== "\r" && char !== "\t")) throw new Error("O arquivo contém conteúdo binário incompatível.");
  const parsed = csvRows(text.replace(/^\uFEFF/,""));
  if(parsed.structuralError) throw new Error(parsed.structuralError);
  return parsed.rows;
}
export function escapeCsvCell(value: unknown) {
  const raw = String(value ?? "");
  const safe = /^[=+\-@]/.test(raw) ? "'" + raw : raw;
  return '"' + safe.replace(/"/g, '""') + '"';
}
function required(entity: ImportEntity) { return entity==="structures" ? ["name","structure_type"] : entity==="units" ? ["code","structure_id"] : entity==="people" ? ["full_name"] : ["unit_id","person_id"]; }
export function normalizeRows(rows: string[][], entity: ImportEntity, today: string): { headers: string[]; rows: ImportRow[]; structuralError?: string } {
  if(!rows.length) return { headers: [], rows: [], structuralError: "Arquivo vazio." };
  const headers = rows[0].map((header) => clean(header).toLowerCase());
  if(!headers.length || headers.some((header) => !header)) return { headers, rows: [], structuralError: "O cabeçalho contém colunas vazias." };
  const missing = required(entity).filter((field) => !headers.includes(field));
  if(missing.length) return { headers, rows: [], structuralError: "Colunas obrigatórias ausentes: " + missing.join(", ") + "." };
  return { headers, rows: rows.slice(1, MAX_ROWS+1).map((raw,index) => { const data = Object.fromEntries(headers.map((header,col) => [header, clean(raw[col])])); if(entity==="owners"||entity==="residents") data.starts_at = data.starts_at || today; const invalid = required(entity).some((field) => !data[field]) || (entity==="structures" && !["block","tower","sector","building","wing","street","phase","other"].includes(data.structure_type)); return { rowNumber:index+2, classification: invalid ? "invalid" : "new", data, message: invalid ? "Campos obrigatórios ausentes ou tipo inválido." : undefined }; }), structuralError: rows.length-1>MAX_ROWS ? "O arquivo excede o limite de 2.000 linhas." : undefined };
}
