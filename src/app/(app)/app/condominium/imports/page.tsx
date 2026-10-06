import { requireCondominiumPermission } from "@/lib/condominium/access";
import { ImportWizard } from "@/components/imports/import-wizard";
export const metadata = { title: "Importação" };
export default async function ImportsPage() {
  await requireCondominiumPermission("imports.read");
  return <ImportWizard />;
}
