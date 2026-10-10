import { ContentSelect } from "@/components/ui/form-controls";
import { Alert } from "@/components/ui/feedback";
import { DocumentUploadForm } from "@/components/maintenance/document-upload-form";

export type NamedOption = { id: string; name: string };
export function SelectField({ label, name, options, selected, required = false }: { label: string; name: string; options: NamedOption[]; selected?: string | null; required?: boolean }) {
  return <label className="cv-field-md">{label}<ContentSelect name={name} defaultValue={selected ?? ""} required={required}><option value="">{required ? "Selecione" : "Não informado"}</option>{options.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</ContentSelect></label>;
}
export function MoneyField({ label, name, value, required = true }: { label: string; name: string; value?: number | string | null; required?: boolean }) {
  return <label className="cv-field-sm">{label}<input name={name} type="number" min="0" step="0.01" inputMode="decimal" defaultValue={value ?? (required ? 0 : "")} required={required} /></label>;
}
export function Feedback({ params }: { params: { error?: string; updated?: string; generated?: string } }) {
  const generated = Number(params.generated);
  return <>{params.error && <Alert tone="error">{params.error}</Alert>}{params.updated && <Alert tone="success">Alterações salvas.</Alert>}{params.generated && <Alert tone={generated > 0 ? "success" : "info"}>{generated > 0 ? `${generated} OS ${generated === 1 ? "foi gerada" : "foram geradas"} com sucesso.` : "Nenhuma OS foi gerada. Não existem preventivas vencidas ou previstas para geração neste momento."}</Alert>}</>;
}
export function DocumentUpload(props: { target: "work_order" | "contract" | "equipment" | "quotation"; id: string; documentId?: string; documentTitle?: string; documentKind?: string }) {
  return <DocumentUploadForm {...props} />;
}
