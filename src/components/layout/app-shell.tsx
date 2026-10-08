"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Building2, CalendarDays, ChevronDown, CircleUserRound, Command, House, LayoutDashboard, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search, ShieldAlert, UserRound, Network, Wrench, DoorOpen, Users, KeyRound, Shield } from "lucide-react";
import { endPlatformTenantContext, signOut } from "@/lib/auth/actions";
import { Brand } from "@/components/layout/brand";
import type { AuthorizedContext } from "@/lib/auth/context";
import { NotificationCenter } from "./notification-center";
import type { NotificationItem } from "@/lib/notifications/notification-types";
import { Button } from "@/components/ui/button";

export function resolveNavigation(context: AuthorizedContext, dashboardAllowed = false, reservationsAllowed = false, occurrencesAllowed = false, importsAllowed = false) {
  if (context.type === "platform") return { resident: false, primary: [{ label: "Plataforma", href: "/app/platform" }], showCondominiumSection: false };
  if (context.type === "condominium" && !dashboardAllowed) return { resident: true, primary: [{ label: "Meu perfil", href: "/app/profile" }, { label: "Minhas Unidades", href: "/app/my-units" }, ...(reservationsAllowed ? [{ label: "Reservas", href: "/app/reservations" }] : []), ...(occurrencesAllowed ? [{ label: "Ocorrências", href: "/app/occurrences" }] : [])], showCondominiumSection: false };
  return { resident: false, primary: [{ label: "Painel", href: "/app/dashboard" }, { label: "Meu perfil", href: "/app/profile" }, ...(occurrencesAllowed ? [{ label: "Ocorrências", href: "/app/occurrences" }] : []), ...(importsAllowed ? [{ label: "Importação", href: "/app/condominium/imports" }] : [])], showCondominiumSection: context.type === "condominium" };
}

export function closeDrawerOnEscape(event: KeyboardEvent, drawerToggle: HTMLInputElement, mainContent?: HTMLElement | null, opener?: HTMLElement | null) {
  if (event.key !== "Escape" || !drawerToggle.checked) return false;
  drawerToggle.checked = false;
  (opener ?? mainContent)?.focus({ preventScroll: true });
  return true;
}

export function AppShell({ children, context, personName, notifications = [], notificationTimeZone = "America/Sao_Paulo", userAccountId, condominiumNavigation = { overview: false, structures: false, maintenance: false, units: false, people: false, residents: false, ownerships: false, gatehouse: false, reservations: false, occurrences: false, dashboard: false, imports: false } }: { children: React.ReactNode; context: AuthorizedContext; personName?: string | null; notifications?: NotificationItem[]; notificationTimeZone?: string; userAccountId?: string; condominiumNavigation?: { overview: boolean; structures: boolean; maintenance?: boolean; units: boolean; people?: boolean; residents?: boolean; ownerships?: boolean; gatehouse?: boolean; reservations?: boolean; occurrences?: boolean; dashboard?: boolean; imports?: boolean } }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const drawerToggleRef = useRef<HTMLInputElement>(null);
  const mainContentRef = useRef<HTMLElement>(null);
  const drawerOpenerRef = useRef<HTMLButtonElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const closeDrawer = () => {
    if (!drawerToggleRef.current) return;
    drawerToggleRef.current.checked = false;
    drawerOpenerRef.current?.focus({ preventScroll: true });
  };
  const openDrawer = () => {
    if (!drawerToggleRef.current) return;
    drawerToggleRef.current.checked = true;
    requestAnimationFrame(() => drawerCloseRef.current?.focus({ preventScroll: true }));
  };
  useEffect(() => {
    if (drawerToggleRef.current?.checked) {
      drawerToggleRef.current.checked = false;
      mainContentRef.current?.focus({ preventScroll: true });
    }
  }, [pathname]);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const drawerToggle = drawerToggleRef.current;
      if (drawerToggle) closeDrawerOnEscape(event, drawerToggle, mainContentRef.current, drawerOpenerRef.current);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  const navClass = (href: string) => `nav-item ${pathname === href || pathname?.startsWith(`${href}/`) ? "nav-active" : ""}`;
  const navigation = resolveNavigation(context, condominiumNavigation.dashboard, condominiumNavigation.reservations, condominiumNavigation.occurrences, condominiumNavigation.imports);
  const nav = navigation.primary.map((item) => ({ ...item, Icon: item.label === "Meu perfil" ? UserRound : LayoutDashboard }));
  return <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
    <input ref={drawerToggleRef} className="drawer-toggle" type="checkbox" id="drawer-toggle" aria-hidden="true" />
    <button type="button" className="drawer-backdrop" onClick={closeDrawer} aria-label="Fechar menu" />
    <aside className="sidebar" aria-label="Navegação principal">
      <div className="sidebar-brand"><Brand light /><Button variant="icon" size="compact" className="desktop-collapse" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"} data-tooltip={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}>{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</Button><button ref={drawerCloseRef} type="button" className="icon-button mobile-menu-close" onClick={closeDrawer} aria-label="Fechar menu"><ChevronDown size={20} /></button></div>
      <Link className="sidebar-context" href={context.type === "platform" || context.actingAsPlatform ? "/app/platform" : "/select-context"} aria-label={`Contexto atual: ${context.name}, ${context.role}`}><span className="context-avatar"><Building2 size={18} /></span><span><strong>{context.name}</strong><small>{context.actingAsPlatform ? "Acessando como Administrador da Plataforma" : context.role}</small></span>{context.type !== "platform" && !context.actingAsPlatform && <ChevronDown size={16} className="context-chevron" />}</Link>
      <div className="nav-label">MENU PRINCIPAL</div>
      <nav>{nav.map(({ label, href, Icon }) => <Link key={href} href={href} title={label} aria-label={label} className={navClass(href)} aria-current={pathname === href ? "page" : undefined}><Icon size={19} /><span>{label}</span></Link>)}{navigation.showCondominiumSection && <div className="nav-group"><div className="nav-label">CONDOMÍNIO</div><Link className={navClass("/app/my-units")} href="/app/my-units"><House size={19}/><span>Minhas Unidades</span></Link>{condominiumNavigation.gatehouse && <Link className={navClass("/app/gatehouse")} href="/app/gatehouse" aria-current={pathname?.startsWith("/app/gatehouse") ? "page" : undefined}><Shield size={19} /><span>Portaria</span></Link>}{condominiumNavigation.reservations && <Link className={navClass("/app/reservations")} href="/app/reservations"><CalendarDays size={19}/><span>Reservas</span></Link>}{condominiumNavigation.overview && <Link className={`nav-item ${pathname === "/app/condominium" ? "nav-active" : ""}`} href="/app/condominium" aria-current={pathname === "/app/condominium" ? "page" : undefined}><Building2 size={19} /><span>Visão Geral</span></Link>}{condominiumNavigation.structures && <Link className={navClass("/app/condominium/structures")} href="/app/condominium/structures" aria-current={pathname?.startsWith("/app/condominium/structures") ? "page" : undefined}><Network size={19} /><span>Estruturas</span></Link>}{condominiumNavigation.maintenance && <Link className={navClass("/app/condominium/maintenance")} href="/app/condominium/maintenance" aria-current={pathname?.startsWith("/app/condominium/maintenance") ? "page" : undefined}><Wrench size={19} /><span>Manutenção</span></Link>}{condominiumNavigation.units && <Link className={navClass("/app/condominium/units")} href="/app/condominium/units" aria-current={pathname?.startsWith("/app/condominium/units") ? "page" : undefined}><DoorOpen size={19} /><span>Unidades</span></Link>}{condominiumNavigation.people && <Link className={navClass("/app/condominium/people")} href="/app/condominium/people"><Users size={19}/><span>Pessoas</span></Link>}{condominiumNavigation.residents && <Link className={navClass("/app/condominium/residents")} href="/app/condominium/residents"><House size={19}/><span>Moradores</span></Link>}{condominiumNavigation.ownerships && <Link className={navClass("/app/condominium/owners")} href="/app/condominium/owners"><KeyRound size={19}/><span>Proprietários</span></Link>}</div>}</nav>
      <div className="sidebar-bottom"><div className="sidebar-help"><div className="help-mark"><Command size={17} /></div><div><strong>Precisa de ajuda?</strong><small>Fale com nosso suporte</small></div><ChevronDown size={15} /></div><div className="sidebar-version">CondoVia <span>v0.1</span></div></div>
    </aside>
    <div className="main-column">
      <header className="topbar">
        <button ref={drawerOpenerRef} type="button" className="icon-button mobile-menu-open" onClick={openDrawer} aria-label="Abrir menu"><Menu size={20} /></button>
        <div className="mobile-brand"><Brand /></div>
        <div className="search-box"><Search size={17} /><input aria-label="Buscar" placeholder="Buscar no CondoVia" /><kbd>⌘ K</kbd></div>
        <div className="topbar-actions"><NotificationCenter initialNotifications={notifications} timeZone={notificationTimeZone} condominiumId={context.type === "condominium" ? context.id : undefined} userAccountId={userAccountId} /><div className="topbar-divider" />{context.actingAsPlatform && <form action={endPlatformTenantContext}><Button variant="secondary" size="compact" type="submit">Voltar para Plataforma</Button></form>}<details className="user-menu"><summary><span className="user-avatar"><CircleUserRound size={21} /></span><span className="user-name"><strong>{personName || "Minha conta"}</strong><small>{context.actingAsPlatform ? "Administrador da Plataforma" : context.role}</small></span><ChevronDown size={15} /></summary><div className="user-dropdown"><form action={signOut}><Button variant="ghost" size="compact" type="submit"><LogOut size={16} /> Sair da conta</Button></form></div></details></div>
      </header>
      <main ref={mainContentRef} tabIndex={-1} className="main-content">{children}</main>
    </div>
  </div>;
}

export function ContextCard({ context, role }: { context: AuthorizedContext; role: string }) {
  return <Link className="context-card" href={context.type === "platform" ? "/app/platform" : `/app/dashboard?context=${encodeURIComponent(context.id)}`}><span className="context-card-icon"><House size={22} /></span><span className="context-card-main"><strong>{context.name}</strong><small>{context.type === "condominium" ? "Condomínio" : context.type === "administrator" ? "Administradora" : "Plataforma"}</small></span><span className="role-badge">{role}</span><span className="context-card-arrow">→</span></Link>;
}

export function NoPermissionNotice() {
  return <section className="no-permission"><span><ShieldAlert size={26} /></span><h1>Sem acesso disponível</h1><p>Sua conta não possui um contexto ativo. Entre em contato com o responsável pelo seu condomínio ou administradora.</p><Link href="/login">Voltar para o início</Link></section>;
}
