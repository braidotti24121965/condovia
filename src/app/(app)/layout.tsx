import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { requireCurrentContext, requireUser } from "@/lib/auth/context";

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
  ]).then(([overview, structures, units, people, residents, ownerships, gatehouse]) => ({
    overview: overview.data === true,
    structures: structures.data === true,
    units: units.data === true,
    people: people.data === true,
    residents: residents.data === true,
    ownerships: ownerships.data === true,
    gatehouse: gatehouse.data === true,
  })) : undefined;
  const { data: account } = await supabase.from("user_accounts").select("people(full_name, preferred_name)").eq("auth_user_id", user.id).maybeSingle();
  const person = account?.people as unknown as { full_name: string; preferred_name: string | null } | null;
  return <AppShell context={context} personName={person?.preferred_name || person?.full_name} condominiumNavigation={condominiumNavigation}>{children}</AppShell>;
}
