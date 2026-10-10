import { formatEventDateTimeInTimezone } from "@/lib/gatehouse/timezone";
import Link from "next/link";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { documentKinds } from "@/lib/maintenance/validation";
import { DocumentUpload } from "@/components/maintenance/management-ui";
import { Alert } from "@/components/ui/feedback";
export async function DocumentList({ target, id, canUpload = false }: { target: "work_order" | "contract" | "equipment" | "quotation"; id: string; canUpload?: boolean }) {
  const { supabase, context } = await requireCondominiumPermission("maintenance.documents.read");
  const { data: documents, error } = await supabase.from("maintenance_documents").select("id,title,document_kind,maintenance_document_versions(id,version,original_filename,created_at)").eq("condominium_id", context.id).eq(`${target}_id`, id).order("created_at", { ascending: false });
  if (error) return <p role="alert">Não foi possível carregar os documentos.</p>;
  return <>{!documents?.length && <Alert tone="info">Nenhum documento anexado para este destino.</Alert>}{documents?.map(d => <details key={d.id} className="cv-maintenance-details"><summary>{d.title} · {documentKinds[d.document_kind] ?? d.document_kind}</summary>
    <ul>{[...(d.maintenance_document_versions ?? [])].sort((a, b) => b.version - a.version).map(v => <li key={v.id}><Link href={`/api/maintenance/documents/${v.id}`}>Versão {v.version} · {v.original_filename}</Link> · {formatEventDateTimeInTimezone(v.created_at, "America/Sao_Paulo")}</li>)}</ul>
    {canUpload && <DocumentUpload target={target} id={id} documentId={d.id} documentTitle={d.title} documentKind={d.document_kind} />}
  </details>)}</>;
}
