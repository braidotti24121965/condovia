import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { requireCurrentContext, requireUser } from "@/lib/auth/context";
import { getNotifications } from "@/lib/notifications/notification-actions";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireUser();
  if (!supabase || !user) redirect("/login");
  const context = await requireCurrentContext();
  const condominiumNavigation = context.type === "condominium" ? await Promise.all([
    supabase.rpc("has_permission", { permission_code: "condominium.read", target_condominium_id: context.id }),
    supabase.rpc("has_permission", { permission_code: "structures.read", target_condominium_id: context.id }),
    supabase.rpc("has_permission", { permission_code: "units.read", target_condominium_id: context.id }),
    supabase.rpc("has_permission", { permission_code: "people.read", target_condominium_id: context.id }),
    supabase.rpc("has_permission", { permission_code: "residents.read", target_condominium_id: context.id }),
    supabase.rpc("has_permission", { permission_code: "ownerships.read", target_condominium_id: context.id }),
    supabase.rpc("has_permission", { permission_code: "gatehouse.read", target_condominium_id: context.id }),
    supabase.rpc("has_permission", { permission_code: "reservations.read", target_condominium_id: context.id }),
    supabase.rpc("has_permission", { permission_code: "occurrences.create", target_condominium_id: context.id }),
    supabase.rpc("has_permission", { permission_code: "occurrences.read", target_condominium_id: context.id }),
    supabase.rpc("has_permission", { permission_code: "dashboard.read", target_condominium_id: context.id }),
    supabase.rpc("has_permission", { permission_code: "imports.read", target_condominium_id: context.id }),
  ]).then(([overview, structures, units, people, residents, ownerships, gatehouse, reservations, occurrenceCreate, occurrenceRead, dashboard, imports]) => ({
    overview: overview.data === true,
    structures: structures.data === true,
    units: units.data === true,
    people: people.data === true,
    residents: residents.data === true,
    ownerships: ownerships.data === true,
    gatehouse: gatehouse.data === true,
    reservations: reservations.data === true,
    occurrences: occurrenceCreate.data === true || occurrenceRead.data === true,
    dashboard: dashboard.data === true,
    imports: imports.data === true,
  })) : undefined;
  const { data: account } = await supabase.from("user_accounts").select("id,person_id").eq("auth_user_id", user.id).maybeSingle();
  const { data: person } = account?.person_id
    ? await supabase.from("people").select("full_name, preferred_name").eq("id", account.person_id).maybeSingle()
    : { data: null };
  const notificationData = context.type === "condominium" ? await getNotifications() : { notifications: [], timeZone: "America/Sao_Paulo" };
  return <AppShell context={context} personName={person?.preferred_name || person?.full_name} userEmail={user.email} userAccountId={account?.id} condominiumNavigation={condominiumNavigation} notifications={notificationData.notifications} notificationTimeZone={notificationData.timeZone}>{children}</AppShell>;
}
