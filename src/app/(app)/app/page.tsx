import { redirect } from "next/navigation";
import { requireCurrentContext, requireUser } from "@/lib/auth/context";

export default async function AppIndex() {
  const { supabase } = await requireUser();
  const context = await requireCurrentContext();
  if (context.type === "platform") redirect("/app/platform");
  if (context.type !== "condominium") redirect("/app/dashboard");
  const { data: canReadDashboard } = await supabase!.rpc("has_permission", {
    permission_code: "dashboard.read",
    target_condominium_id: context.id,
  });
  redirect(canReadDashboard === true ? "/app/dashboard" : "/app/my-units");
}
