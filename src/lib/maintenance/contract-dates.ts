import { civilDateToIso, isoToCivilDate } from "@/lib/condominium/formats";

export function contractDateError(start: string, end: string): string | null {
  if (!start || !end || civilDateToIso(isoToCivilDate(start)) !== start || civilDateToIso(isoToCivilDate(end)) !== end) {
    return "Informe datas de início e término válidas.";
  }
  return end < start ? "A data de término deve ser igual ou posterior à data de início." : null;
}
