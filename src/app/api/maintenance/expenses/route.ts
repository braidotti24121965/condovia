import { NextResponse } from "next/server";
import { requireCondominiumPermission } from "@/lib/condominium/access";
const csv = (value: unknown) => `"${String(value ?? "").replace(/^[=+@-]/, "'$&").replaceAll('"', '""')}"`;
export async function GET() {
  const { supabase, context } = await requireCondominiumPermission("maintenance.finance.read");
  const { data, error } = await supabase.from("maintenance_expenses").select("id,work_order_id,service_provider_id,amount,status,created_at").eq("condominium_id", context.id).order("created_at");
  if (error) return NextResponse.json({ error: "Não foi possível exportar despesas" }, { status: 500 });
  const lines = ["Despesa;OS;Fornecedor;Valor;Situação;Criada em", ...(data ?? []).map(row => [row.id, row.work_order_id, row.service_provider_id, String(row.amount).replace(".", ","), row.status, row.created_at].map(csv).join(";"))];
  return new NextResponse(`\uFEFF${lines.join("\r\n")}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="despesas-manutencao.csv"', "Cache-Control": "private, no-store" } });
}
