import Link from "next/link";
import { ChevronRight, Megaphone } from "lucide-react";
import { hasPermission, requireCondominiumPermission } from "@/lib/condominium/access";
import { markCommunicationReadAction, publishCommunicationAction } from "@/lib/communications/actions";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { SubmitButton } from "@/components/ui/submit-button";
import { StatusBadge } from "@/components/ui/status-badge";

export const metadata = { title: "Comunicados" };

export default async function CommunicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; updated?: string }>;
}) {
  const { supabase, user, context } = await requireCondominiumPermission("communications.read");
  const params = await searchParams;
  const [{ data: canPublish }, { data: communications }, { data: structures }, { data: account }] = await Promise.all([
    hasPermission("communications.publish", context.id),
    supabase
      .from("communications")
      .select("id, title, body, published_at, structure_id, condominium_structures(name)")
      .eq("condominium_id", context.id)
      .eq("status", "published")
      .order("published_at", { ascending: false }),
    supabase.from("condominium_structures").select("id, name").eq("condominium_id", context.id).eq("status", "active").order("name"),
    supabase.from("user_accounts").select("id").eq("auth_user_id", user.id).maybeSingle(),
  ]);

  const { data: reads } = account
    ? await supabase.from("communication_reads").select("communication_id").eq("user_account_id", account.id)
    : { data: [] as { communication_id: string }[] };
  const readIds = new Set((reads ?? []).map((row) => row.communication_id));

  return (
    <div className="cv-page">
      <div className="breadcrumbs">
        <Link href="/app/dashboard">Início</Link>
        <ChevronRight size={14} />
        <strong>Comunicados</strong>
      </div>
      <section className="page-heading">
        <div>
          <p className="page-overline">P10 · COMUNICAÇÃO</p>
          <h1>Comunicados</h1>
          <p>Avisos do condomínio {context.name}. Os comunicados são publicados somente pelo aplicativo.</p>
        </div>
      </section>

      {params.error && <Alert tone="error">{params.error}</Alert>}
      {(params.saved || params.updated) && <Alert tone="success">Alterações salvas.</Alert>}

      {canPublish === true && (
        <section className="cv-panel">
          <div className="cv-panel-heading">
            <div>
              <h2>
                <Megaphone size={18} /> Novo comunicado
              </h2>
              <p>Escolha o público. Sem estrutura, o comunicado vai para todo o condomínio.</p>
            </div>
          </div>
          <form action={publishCommunicationAction} className="cv-form">
            <label className="cv-field-wide">
              Título *
              <input name="title" required minLength={3} maxLength={160} />
            </label>
            <label className="cv-field-wide">
              Texto *
              <textarea name="body" required minLength={3} maxLength={5000} rows={4} />
            </label>
            <label>
              Público
              <select name="structure_id" defaultValue="">
                <option value="">Todo o condomínio</option>
                {(structures ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="cv-form-actions">
              <SubmitButton type="submit">Publicar comunicado</SubmitButton>
            </div>
          </form>
        </section>
      )}

      <section className="cv-panel">
        <div className="cv-panel-heading">
          <div>
            <h2>Comunicados publicados</h2>
          </div>
        </div>
        {(communications ?? []).length === 0 ? (
          <EmptyState title="Nenhum comunicado" description="Os comunicados publicados aparecerão aqui." />
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {(communications ?? []).map((item) => {
              const isRead = readIds.has(item.id);
              const scope = item.structure_id ? (item.condominium_structures as { name?: string } | null)?.name ?? "Estrutura" : "Todo o condomínio";
              return (
                <article key={item.id} className="cv-panel" style={{ display: "grid", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                    <strong>{item.title}</strong>
                    <StatusBadge variant={isRead ? "success" : "info"}>{isRead ? "Lido" : "Não lido"}</StatusBadge>
                  </div>
                  <p className="cv-muted" style={{ margin: 0, fontSize: "13px" }}>
                    {scope} · {item.published_at ? new Date(item.published_at).toLocaleDateString("pt-BR") : ""}
                  </p>
                  <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{item.body}</p>
                  {!isRead && account && (
                    <form action={markCommunicationReadAction}>
                      <input type="hidden" name="communication_id" value={item.id} />
                      <SubmitButton type="submit" variant="secondary">
                        Confirmar leitura
                      </SubmitButton>
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
