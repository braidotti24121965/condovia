import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { requireCurrentContext, requireUser } from "@/lib/auth/context";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireUser();
  if (!supabase || !user) redirect("/login");
  const context = await requireCurrentContext();
  const { data: account } = await supabase.from("user_accounts").select("people(full_name, preferred_name)").eq("auth_user_id", user.id).maybeSingle();
  const person = account?.people as unknown as { full_name: string; preferred_name: string | null } | null;
  return <AppShell context={context} personName={person?.preferred_name || person?.full_name}>{children}</AppShell>;
}
