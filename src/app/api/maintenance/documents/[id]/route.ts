import { NextResponse } from "next/server";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { validUuid } from "@/lib/maintenance/validation";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, context } = await requireCondominiumPermission("maintenance.documents.read");
  const { id } = await params;
  if (!validUuid(id)) return NextResponse.json({ error: "Documento inválido" }, { status: 400 });
  const { data, error } = await supabase.from("maintenance_document_versions").select("object_path,original_filename").eq("id", id).eq("condominium_id", context.id).maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
  const { data: signed, error: signingError } = await supabase.storage.from("maintenance-documents").createSignedUrl(data.object_path, 60, { download: data.original_filename });
  if (signingError || !signed) return NextResponse.json({ error: "Documento indisponível" }, { status: 404 });
  return NextResponse.redirect(signed.signedUrl, { headers: { "Cache-Control": "private, no-store" } });
}
