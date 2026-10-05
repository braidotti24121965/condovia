import type { AccessPoint } from "@/lib/gatehouse/types";

export const accessPointTypeLabels: Record<AccessPoint["type"], string> = {
  pedestrian: "Pedestres",
  vehicle: "Veículos",
  service: "Serviço",
  mixed: "Misto",
};
