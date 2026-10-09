import Link from "next/link";
import { requireCurrentContext, requireUser } from "@/lib/auth/context";
export async function RelatedMaintenanceOrders({ occurrenceId }: { occurrenceId: string }) {
  const { supabase } = await requireUser();
  const context = await requireCurrentContext();
  if (!supabase || context.type !== "condominium") return null;
  const [{ data: canRead }, { data: canCreate }, { data: canLink }] = await Promise.all([
    supabase.rpc("has_permission", { permission_code: "maintenance.orders.read", target_condominium_id: context.id }),
    supabase.rpc("has_permission", { permission_code: "maintenance.orders.create", target_condominium_id: context.id }),
    supabase.rpc("has_permission", { permission_code: "maintenance.finance.manage", target_condominium_id: context.id }),
  ]);
  if (canRead !== true) return null;
  const { data: orders } = await supabase.from("maintenance_work_orders").select("id,work_order_number,description").eq("condominium_id", context.id).eq("occurrence_id", occurrenceId);
  return <section className="cv-panel"><h2>Ordens de serviço vinculadas</h2>{orders?.length ? <ul>{orders.map(o => <li key={o.id}><Link href={`/app/condominium/maintenance/work-orders/${o.id}`}>OS #{o.work_order_number} · {o.description}</Link></li>)}</ul> : <p>Nenhuma OS vinculada.</p>}
    {canCreate === true && canLink === true && <Link className="button button-secondary" href={`/app/condominium/maintenance/work-orders?occurrence_id=${occurrenceId}`}>Criar OS para esta ocorrência</Link>}
  </section>;
}
