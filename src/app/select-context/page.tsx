import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, CircleHelp } from "lucide-react";
import { selectContext, signOut } from "@/lib/auth/actions";
import { getAuthorizedContexts, requireUser } from "@/lib/auth/context";
import { Brand } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Escolher contexto" };

export default async function SelectContextPage() {
  const { user } = await requireUser();
  if (!user) redirect("/login");
  const contexts = await getAuthorizedContexts();
  if (contexts.length === 0) redirect("/no-permission");
  if (contexts.length === 1) redirect(contexts[0].type === "platform" ? "/app/platform" : `/app/dashboard?context=${encodeURIComponent(contexts[0].id)}`);
  return <main className="select-page"><header className="select-header"><Brand /><div className="secure-label"><span className="small-status-dot" /> Sessão protegida</div></header><section className="select-content"><a className="back-link" href="/login"><ChevronLeft size={16} /> Voltar</a><p className="eyebrow">SEU ACESSO CONDOVIA</p><h1>Onde você quer<br />acessar?</h1><p className="select-intro">Olá, <strong>{user.email}</strong>. Escolha um dos contextos vinculados à sua conta.</p><div className="context-list" aria-label="Contextos disponíveis">{contexts.map((context) => <form key={`${context.type}:${context.id}`} action={selectContext}><input type="hidden" name="contextId" value={context.id} /><Button variant="ghost" className="context-option" type="submit"><span className="context-option-icon">{context.type === "condominium" ? "C" : context.type === "administrator" ? "A" : "P"}</span><span className="context-option-copy"><strong>{context.name}</strong><small>{context.type === "condominium" ? "Condomínio" : context.type === "administrator" ? "Administradora" : "Plataforma"}</small></span><span className="role-badge">{context.role}</span><ChevronRight size={18} className="context-option-arrow" /></Button></form>)}</div><div className="select-help"><CircleHelp size={17} /><span>Não encontrou o contexto que procura? Entre em contato com o responsável pelo seu acesso.</span></div><form action={signOut}><Button variant="ghost" className="text-button" type="submit">Sair da conta</Button></form></section><footer className="auth-legal"><span>© 2026 CondoVia by Kynovia</span><span>Gestão inteligente de condomínios</span></footer></main>;
}
