import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { EquipmentForm } from "@/components/maintenance/equipment-form";
import { DocumentList } from "@/components/maintenance/document-list";
import { DocumentUpload } from "@/components/maintenance/management-ui";
import type { Equipment } from "@/lib/maintenance/types";
import { civilDate } from "@/lib/maintenance/validation";
export default async function EquipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, context } = await requireCondominiumPermission("maintenance.read");
  const { id } = await params;
  const [equipment, structures, categories, orders, manage, documents, upload] = await Promise.all([
    supabase.from("maintenance_equipment").select("*").eq("id", id).eq("condominium_id", context.id).maybeSingle(),
    supabase.from("condominium_structures").select("id,name").eq("condominium_id", context.id).eq("status", "active"),
    supabase.from("maintenance_equipment_categories").select("id,name").eq("condominium_id", context.id).eq("status", "active"),
    supabase.from("maintenance_work_orders").select("id,work_order_number,description,due_at,status").eq("equipment_id", id).eq("condominium_id", context.id).order("created_at", { ascending: false }),
    supabase.rpc("has_permission", { permission_code: "maintenance.manage", target_condominium_id: context.id }),
    supabase.rpc("has_permission", { permission_code: "maintenance.documents.read", target_condominium_id: context.id }),
    supabase.rpc("has_permission", { permission_code: "maintenance.documents.manage", target_condominium_id: context.id }),
  ]);
  if (!equipment.data || equipment.error) notFound();
  return <div className="cv-page"><section className="page-heading"><div><h1>{equipment.data.identification}</h1><p>Equipamento · garantia até {civilDate(equipment.data.warranty_until)}</p></div></section>
    <section className="cv-panel"><h2>Cadastro</h2>{manage.data === true ? <EquipmentForm current={equipment.data as Equipment} structures={structures.data ?? []} categories={categories.data ?? []} /> : <p>{equipment.data.location ?? "Local não informado"} · {equipment.data.manufacturer ?? ""} · {equipment.data.model ?? ""}</p>}</section>
    <section className="cv-panel"><h2>Histórico de manutenção</h2><ul>{orders.data?.map(o => <li key={o.id}><Link href={`/app/condominium/maintenance/work-orders/${o.id}`}>OS #{o.work_order_number} · {o.description} · {civilDate(o.due_at)}</Link></li>)}</ul></section>
    {documents.data === true && <section className="cv-panel"><h2>Laudos, garantias e documentação</h2><DocumentList target="equipment" id={id} canUpload={upload.data === true} />{upload.data === true && <DocumentUpload target="equipment" id={id} />}</section>}
  </div>;
}
