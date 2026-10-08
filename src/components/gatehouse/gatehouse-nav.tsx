"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UserCheck,
  Briefcase,
  KeyRound,
  LogIn,
  Package as PackageIcon,
  History,
  DoorOpen,
} from "lucide-react";
import { isGatehouseNavItemActive } from "./gatehouse-nav-state";

export function GatehouseNav() {
  const pathname = usePathname();

  const links = [
    { href: "/app/gatehouse", label: "Painel", icon: LayoutDashboard },
    { href: "/app/gatehouse/access", label: "Presença", icon: LogIn },
    { href: "/app/gatehouse/authorizations", label: "Autorizações", icon: KeyRound },
    { href: "/app/gatehouse/packages", label: "Encomendas", icon: PackageIcon },
    { href: "/app/gatehouse/visitors", label: "Visitantes", icon: UserCheck },
    { href: "/app/gatehouse/providers", label: "Prestadores", icon: Briefcase },
    { href: "/app/gatehouse/history", label: "Histórico", icon: History },
    { href: "/app/gatehouse/access-points", label: "Pontos de acesso", icon: DoorOpen },
  ];

  return (
    <nav className="cv-gatehouse-nav" aria-label="Navegação da Portaria">
      {links.map(({ href, label, icon: Icon }) => {
        const isActive = isGatehouseNavItemActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={`cv-gatehouse-nav-item ${isActive ? "active" : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon size={16} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
