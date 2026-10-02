import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { signOut } from "@/lib/auth/actions";
import { Brand } from "@/components/layout/brand";

export const metadata: Metadata = { title: "Sem permissão" };

export default async function NoPermissionPage() {
  return <main className="select-page"><header className="select-header"><Brand /><div className="secure-label"><span className="small-status-dot" /> Sessão protegida</div></header><section className="no-permission standalone"><span><ShieldAlert size={26} /></span><h1>Acesso não disponível</h1><p>Sua conta não possui um contexto ativo ou a permissão necessária para acessar esta área. Entre em contato com o responsável pelo seu acesso.</p><form action={signOut}><button className="button button-secondary" type="submit">Sair da conta</button></form></section><footer className="auth-legal"><span>© 2026 CondoVia by Kynovia</span><span>Gestão inteligente de condomínios</span></footer></main>;
}
