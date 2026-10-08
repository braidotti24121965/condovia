export type EquipmentStatus = "active" | "inactive" | "retired";
export type Equipment = {
  id: string;
  identification: string;
  location: string | null;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  installed_at: string | null;
  warranty_until: string | null;
  status: EquipmentStatus;
  structure_id: string;
  condominium_structures: { name: string } | null;
  maintenance_equipment_categories: { name: string } | null;
};
