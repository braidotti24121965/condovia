"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, Building2, ChevronDown, CircleUserRound, Command, House, LayoutDashboard, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search, ShieldAlert, UserRound } from "lucide-react";
import { signOut } from "@/lib/auth/actions";
import { Brand } from "@/components/layout/brand";
import type { AuthorizedContext } from "@/lib/auth/context";

export function AppShell({ children, context, personName }: { children: React.ReactNode; context: AuthorizedContext; personName?: string | null }) {
  const [collapsed, setCollapsed] = useState(false);
  const nav = [{ label: "Painel", href: "/app/dashboard", Icon: LayoutDashboard, active: true }, { label: "Meu perfil", href: "/app/profile", Icon: UserRound, active: false }];
  return <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
    <input className="drawer-toggle" type="checkbox" id="drawer-toggle" aria-hidden="true" />
    <label className="drawer-backdrop" htmlFor="drawer-toggle" aria-label="Fechar menu" />
    <aside className="sidebar" aria-label="Navegação principal">
      <div className="sidebar-brand"><Brand light /><button className="icon-button desktop-collapse" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"} title={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}>{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button><label className="icon-button mobile-menu-close" htmlFor="drawer-toggle" aria-label="Fechar menu"><ChevronDown size={20} /></label></div>
      <Link className="sidebar-context" href="/select-context" aria-label={`Trocar contexto. Atual: ${context.name}, ${context.role}`}><span className="context-avatar"><Building2 size={18} /></span><span><strong>{context.name}</strong><small>{context.role}</small></span><ChevronDown size={16} className="context-chevron" /></Link>
      <div className="nav-label">MENU PRINCIPAL</div>
      <nav>{nav.map(({ label, href, Icon, active }) => <Link key={href} href={href} title={label} aria-label={label} className={`nav-item ${active ? "nav-active" : ""}`}><Icon size={19} /><span>{label}</span></Link>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-help"><div className="help-mark"><Command size={17} /></div><div><strong>Precisa de ajuda?</strong><small>Fale com nosso suporte</small></div><ChevronDown size={15} /></div><div className="sidebar-version">CondoVia <span>v0.1</span></div></div>
    </aside>
    <div className="main-column">
      <header className="topbar">
        <label htmlFor="drawer-toggle" className="icon-button mobile-menu-open" aria-label="Abrir menu"><Menu size={20} /></label>
        <div className="mobile-brand"><Brand /></div>
        <div className="search-box"><Search size={17} /><input aria-label="Buscar" placeholder="Buscar no CondoVia" /><kbd>⌘ K</kbd></div>
        <div className="topbar-actions"><button className="icon-button notification-button" aria-label="Notificações"><Bell size={19} /><span /></button><div className="topbar-divider" /><details className="user-menu"><summary><span className="user-avatar"><CircleUserRound size={21} /></span><span className="user-name"><strong>{personName || "Minha conta"}</strong><small>{context.role}</small></span><ChevronDown size={15} /></summary><div className="user-dropdown"><form action={signOut}><button type="submit"><LogOut size={16} /> Sair da conta</button></form></div></details></div>
      </header>
      <main className="main-content">{children}</main>
    </div>
  </div>;
}

export function ContextCard({ context, role }: { context: AuthorizedContext; role: string }) {
  return <Link className="context-card" href={`/app/dashboard?context=${encodeURIComponent(context.id)}`}><span className="context-card-icon"><House size={22} /></span><span className="context-card-main"><strong>{context.name}</strong><small>{context.type === "condominium" ? "Condomínio" : "Administradora"}</small></span><span className="role-badge">{role}</span><span className="context-card-arrow">→</span></Link>;
}

export function NoPermissionNotice() {
  return <section className="no-permission"><span><ShieldAlert size={26} /></span><h1>Sem acesso disponível</h1><p>Sua conta não possui um contexto ativo. Entre em contato com o responsável pelo seu condomínio ou administradora.</p><Link href="/login">Voltar para o início</Link></section>;
}
