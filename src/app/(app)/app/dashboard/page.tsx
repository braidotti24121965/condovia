import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowUpRight, Building2, CalendarDays, CheckCircle2, ChevronRight, CircleHelp, Clock3, ShieldCheck, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/ui/feedback";
import { requireCurrentContext, requireUser } from "@/lib/auth/context";

export const metadata: Metadata = { title: "Painel" };

export default async function DashboardPage() {
  const { supabase } = await requireUser();
  const context = await requireCurrentContext();
  if (context.type === "platform") redirect("/app/platform");
  const displayDate = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo",
  }).format(new Date()).toLocaleUpperCase("pt-BR");
  const { data: allowed } = context.type === "condominium"
    ? await supabase!.rpc("has_permission", { permission_code: "dashboard.read", target_condominium_id: context.id })
    : await supabase!.rpc("has_administrator_permission", { permission_code: "administrator.read", target_administrator_id: context.id });
  if (!allowed) redirect("/no-permission");

  return <div className="dashboard-page">
    <div className="breadcrumbs"><span>Início</span><ChevronRight size={14} /><strong>Painel</strong></div>
    <section className="page-heading"><div><p className="page-overline">{displayDate}</p><h1>Bem-vindo ao CondoVia</h1><p>Este é o espaço de gestão de <strong>{context.name}</strong>.</p></div><div className="heading-status"><span className="status-dot" /> Sistema operacional</div></section>
    <section className="welcome-banner"><div className="banner-copy"><span className="banner-kicker"><Sparkles size={15} /> SEU AMBIENTE CONECTADO</span><h2>Gestão mais simples,<br />todos os dias.</h2><p>Seu espaço de gestão está pronto para acompanhar o que acontece {context.type === "condominium" ? "no condomínio" : "na administradora"}.</p></div><div className="banner-art" aria-hidden="true"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-building"><div /><div /><div /></div><div className="art-pin"><Building2 size={19} /></div><div className="art-spark spark-one">✦</div><div className="art-spark spark-two">✧</div></div><div className="banner-foot"><span><ShieldCheck size={16} /> Seu acesso é protegido</span><span>GESTÃO SEGURA E CONECTADA</span></div></section>
    <div className="section-title-row"><div><h2>Visão geral</h2><p>Resumo do ambiente de gestão</p></div><button className="date-filter" disabled><CalendarDays size={16} /> Hoje <ChevronRight size={14} /></button></div>
    <section className="overview-grid" aria-label="Visão geral do sistema"><article className="overview-card"><span className="overview-icon teal-icon"><Building2 size={18} /></span><span className="overview-label">Contexto ativo</span><strong className="overview-value overview-context">{context.name}</strong><span className="overview-foot">{context.role}</span></article><article className="overview-card"><span className="overview-icon blue-icon"><ShieldCheck size={18} /></span><span className="overview-label">Acesso</span><strong className="overview-value">Verificado</strong><span className="overview-foot"><span className="small-status-dot" /> Permissões atualizadas</span></article><article className="overview-card"><span className="overview-icon violet-icon"><Clock3 size={18} /></span><span className="overview-label">Sua sessão</span><strong className="overview-value">Ativa</strong><span className="overview-foot">Autenticação segura</span></article></section>
    <section className="dashboard-lower"><div className="activity-panel"><div className="panel-heading"><div><h2>Atividade recente</h2><p>Acompanhe as novidades por aqui</p></div><button aria-label="Ajuda sobre atividade recente" className="subtle-icon" disabled><CircleHelp size={17} /></button></div><EmptyState title="Tudo tranquilo por aqui" description={`As atividades ${context.type === "condominium" ? "do seu condomínio" : "da sua administradora"} aparecerão neste espaço quando estiverem disponíveis.`} /></div><aside className="quick-panel"><span className="quick-mark"><CheckCircle2 size={19} /></span><div><h3>Conta protegida</h3><p>Seu acesso é validado com segurança pelo CondoVia.</p></div><div className="quick-divider" /><span className="quick-meta">ACESSO CONFIRMADO <CheckCircle2 size={13} /></span></aside></section>
    <footer className="dashboard-footer"><span>CondoVia <span>by Kynovia</span></span><span>Um jeito mais simples de cuidar do seu condomínio <ArrowUpRight size={13} /></span></footer>
  </div>;
}
