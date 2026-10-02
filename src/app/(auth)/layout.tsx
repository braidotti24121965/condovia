import { Brand } from "@/components/layout/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="auth-page"><div className="auth-top"><Brand /></div><div className="auth-backdrop"><div className="auth-glow auth-glow-one" /><div className="auth-glow auth-glow-two" /><div className="auth-dot-grid" /></div><div className="auth-main">{children}</div><footer className="auth-legal"><span>© 2026 CondoVia by Kynovia</span><span>Gestão inteligente de condomínios</span></footer></main>;
}
