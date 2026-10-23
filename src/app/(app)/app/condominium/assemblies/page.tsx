import Link from "next/link";
import { ContentSelect, DateInput } from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { hasPermission, requireCondominiumPermission } from "@/lib/condominium/access";
import { assemblyConvocationLabels, assemblyMatterLabels } from "@/lib/voting/labels";
import { createAssemblyAction } from "@/lib/voting/actions";

export const metadata = { title: "Assembleias" };

export default async function AssembliesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { supabase, context } = await requireCondominiumPermission("assemblies.read");
  const params = await searchParams;
  const [{ data: assemblies, error }, { data: canManage }] = await Promise.all([
    supabase.from("assemblies").select("id,title,matter,convocation,held_at").eq("condominium_id", context.id).order("held_at", { ascending: false }),
    hasPermission("assemblies.manage", context.id),
  ]);

  return <div className="cv-page">
    <div className="breadcrumbs"><strong>Condomínio</strong><span aria-hidden="true">›</span><strong>Assembleias</strong></div>
    {params.error && <Alert tone="error">{params.error}</Alert>}
    {error && <Alert tone="error">Não foi possível carregar as assembleias.</Alert>}

    {canManage === true && <section className="cv-form-section">
      <h2>Nova assembleia</h2>
      <form action={createAssemblyAction} className="cv-form">
        <div className="cv-form-grid">
          <label className="cv-field-lg">Título<input name="title" required minLength={3} maxLength={160} /></label>
          <label className="cv-field-lg">Matéria<ContentSelect name="matter" required defaultValue="other">{Object.entries(assemblyMatterLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</ContentSelect></label>
          <label className="cv-field-auto">Convocação<ContentSelect name="convocation" defaultValue="first">{Object.entries(assemblyConvocationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</ContentSelect></label>
          <label className="cv-field-md">Data da assembleia<DateInput name="held_on" required /></label>
          <Button type="submit" variant="primary">Criar assembleia</Button>
        </div>
      </form>
    </section>}

    {assemblies && assemblies.length === 0 && <EmptyState title="Nenhuma assembleia" description="As assembleias criadas aparecem aqui." />}
    {assemblies && assemblies.length > 0 && <div className="cv-table-wrap">
      <table className="cv-table">
        <thead><tr><th>Assembleia</th><th>Matéria</th><th>Convocação</th><th>Data</th></tr></thead>
        <tbody>{assemblies.map((assembly) => <tr key={assembly.id}>
          <td><Link href={`/app/condominium/assemblies/${assembly.id}`}>{assembly.title}</Link></td>
          <td>{assemblyMatterLabels[assembly.matter as keyof typeof assemblyMatterLabels]}</td>
          <td>{assemblyConvocationLabels[assembly.convocation as keyof typeof assemblyConvocationLabels]}</td>
          <td>{new Date(assembly.held_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td>
        </tr>)}</tbody>
      </table>
    </div>}
  </div>;
}
