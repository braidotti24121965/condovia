export type ImportEntity = "structures" | "units" | "people" | "owners" | "residents";
export type ImportClassification = "new" | "duplicate" | "invalid";
export type ImportRow = { rowNumber: number; classification: ImportClassification; data: Record<string, string>; message?: string };
export const importEntities: Array<{ value: ImportEntity; label: string }> = [
  { value: "structures", label: "Estruturas / Blocos / Torres" }, { value: "units", label: "Unidades" },
  { value: "people", label: "Pessoas" }, { value: "owners", label: "Proprietários" }, { value: "residents", label: "Moradores" },
];
export const importTemplates: Record<ImportEntity, string[]> = {
  structures: ["name", "structure_type", "code", "parent_id"],
  units: ["code", "structure_id", "display_name", "unit_type", "floor"],
  people: ["full_name", "preferred_name", "birth_date"],
  owners: ["unit_id", "person_id", "ownership_percentage", "starts_at", "ends_at"],
  residents: ["unit_id", "person_id", "occupancy_type", "starts_at", "ends_at"],
};
