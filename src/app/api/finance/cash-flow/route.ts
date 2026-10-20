import { NextResponse } from "next/server";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { isFinanceEnabled } from "@/lib/finance/flag";
import { notFound } from "next/navigation";

const csv = (value: unknown) => `"${String(value ?? "").replace(/^[=+@-]/, "'$&").replaceAll('"', '""')}"`;
const displayDate = (value: string) => { const [year, month, day] = value.split("-"); return `${day}/${month}/${year}`; };

export async function GET() {
  if (!isFinanceEnabled()) notFound();
  const { supabase, context } = await requireCondominiumPermission("finance.payables.read");
  const [{ data: payables }, { data: receivables }] = await Promise.all([
    supabase.from("condominium_payables").select("description,competence_date,due_date,amount_cents,status").eq("condominium_id", context.id).order("due_date"),
    supabase.from("condominium_receivables").select("description,competence_date,due_date,amount_cents,status").eq("condominium_id", context.id).order("due_date"),
  ]);
  const lines = ["Tipo;Descrição;Competência;Vencimento;Valor;Status", ...(receivables ?? []).map(row => ["Entrada", row.description, displayDate(row.competence_date), displayDate(row.due_date), (Number(row.amount_cents) / 100).toFixed(2).replace(".", ","), row.status].map(csv).join(";")), ...(payables ?? []).map(row => ["Saída", row.description, displayDate(row.competence_date), displayDate(row.due_date), (Number(row.amount_cents) / 100).toFixed(2).replace(".", ","), row.status].map(csv).join(";"))];
  return new NextResponse(`\uFEFF${lines.join("\r\n")}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="fluxo-de-caixa-condominio.csv"', "Cache-Control": "private, no-store" } });
}
