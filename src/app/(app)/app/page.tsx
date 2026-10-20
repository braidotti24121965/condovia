import { redirect } from "next/navigation";
import { requireCurrentContext, requireUser } from "@/lib/auth/context";
import { hasPermission } from "@/lib/condominium/access";

export default async function AppIndex() {
  await requireUser();
  const context = await requireCurrentContext();
  if (context.type === "platform") redirect("/app/platform");
  if (context.type !== "condominium") redirect("/app/dashboard");
  const { data: canReadDashboard } = await hasPermission("dashboard.read", context.id);
  redirect(canReadDashboard === true ? "/app/dashboard" : "/app/my-units");
}
