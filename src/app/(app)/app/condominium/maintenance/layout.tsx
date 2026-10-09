import { MaintenanceNav } from "@/components/maintenance/maintenance-nav";
export default function MaintenanceLayout({ children }: { children: React.ReactNode }) {
  return <><MaintenanceNav />{children}</>;
}
