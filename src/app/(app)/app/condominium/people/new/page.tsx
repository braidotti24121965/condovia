import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PersonForm } from "@/components/condominium/person-form";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { Alert } from "@/components/ui/feedback";
import { safePersonRelationshipReturnPath } from "@/lib/condominium/person-return";

export const metadata = { title: "Nova pessoa" };
export default async function NewPersonPage({ searchParams }: { searchParams: Promise<{ error?: string; returnTo?: string; relationship?: string }> }) {
  const { context } = await requireCondominiumPermission("people.manage"); const params = await searchParams;
  const returnPath=safePersonRelationshipReturnPath(params.returnTo||"",params.relationship||"");
  return <div className="cv-page"><div className="breadcrumbs"><Link href="/app/condominium">Condomínio</Link><ChevronRight size={14}/><Link href="/app/condominium/people">Pessoas</Link><ChevronRight size={14}/><strong>Nova pessoa</strong></div>
    <section className="page-heading"><div><p className="page-overline">PESSOAS</p><h1>Nova pessoa</h1><p>O cadastro ficará vinculado somente a {context.name}.</p></div>{returnPath&&<Link className="button button-secondary" href={returnPath}>Cancelar e voltar ao vínculo</Link>}</section>
    {params.error&&<Alert tone="error">{params.error}</Alert>}
    {returnPath&&<p className="cv-form-hint" role="status">Depois do cadastro, você voltará ao vínculo e esta pessoa ficará selecionada.</p>}
    <section className="cv-panel"><PersonForm returnPath={returnPath||""} returnKind={returnPath?params.relationship||"":""}/></section>
  </div>;
}
