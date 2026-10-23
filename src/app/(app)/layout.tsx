import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { requireCurrentContext, requireUser } from "@/lib/auth/context";
import { hasPermission } from "@/lib/condominium/access";
import { getNotifications } from "@/lib/notifications/notification-actions";
import { isFinanceEnabled } from "@/lib/finance/flag";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireUser();
  if (!supabase || !user) redirect("/login");
  const context = await requireCurrentContext();
  const financeEnabled = isFinanceEnabled();
  const condominiumNavigation = context.type === "condominium" ? await Promise.all([
    hasPermission("condominium.read", context.id),
    hasPermission("structures.read", context.id),
    hasPermission("maintenance.read", context.id),
    hasPermission("maintenance.requests.read", context.id),
    hasPermission("maintenance.requests.create", context.id),
    hasPermission("units.read", context.id),
    hasPermission("people.read", context.id),
    hasPermission("residents.read", context.id),
    hasPermission("ownerships.read", context.id),
    hasPermission("gatehouse.read", context.id),
    hasPermission("reservations.read", context.id),
    hasPermission("occurrences.create", context.id),
    hasPermission("occurrences.read", context.id),
    hasPermission("dashboard.read", context.id),
    hasPermission("imports.read", context.id),
    hasPermission("communications.read", context.id),
    hasPermission("assemblies.read", context.id),
    financeEnabled ? hasPermission("finance.payables.read", context.id) : Promise.resolve({ data: false }),
  ]).then(([overview, structures, maintenance, maintenanceRequestsRead, maintenanceRequestsCreate, units, people, residents, ownerships, gatehouse, reservations, occurrenceCreate, occurrenceRead, dashboard, imports, communications, assemblies, finance]) => ({
    overview: overview.data === true,
    structures: structures.data === true,
    maintenanceFoundation: maintenance.data === true,
    maintenance: maintenance.data === true || maintenanceRequestsRead.data === true || maintenanceRequestsCreate.data === true,
    units: units.data === true,
    people: people.data === true,
    residents: residents.data === true,
    ownerships: ownerships.data === true,
    gatehouse: gatehouse.data === true,
    reservations: reservations.data === true,
    occurrences: occurrenceCreate.data === true || occurrenceRead.data === true,
    dashboard: dashboard.data === true,
    imports: imports.data === true,
    communications: communications.data === true,
    assemblies: assemblies.data === true,
    finance: finance.data === true,
  })) : undefined;
  const { data: account } = await supabase.from("user_accounts").select("id").eq("auth_user_id", user.id).maybeSingle();
  const { data: displayName } = await supabase.rpc("get_my_display_name");
  const notificationData = context.type === "condominium" ? await getNotifications() : { notifications: [], timeZone: "America/Sao_Paulo" };
  const maintenanceHref = context.type === "condominium" && condominiumNavigation && !condominiumNavigation.maintenanceFoundation ? "/app/condominium/maintenance/requests" : "/app/condominium/maintenance";
  return <AppShell context={context} personName={displayName} userEmail={user.email} userAccountId={account?.id} maintenanceHref={maintenanceHref} condominiumNavigation={condominiumNavigation} notifications={notificationData.notifications} notificationTimeZone={notificationData.timeZone}>{children}</AppShell>;
}
