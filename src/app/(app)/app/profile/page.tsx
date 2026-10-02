import type { Metadata } from "next";
import { ChevronRight, CircleUserRound, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth/context";

export const metadata: Metadata = { title: "Meu perfil" };

export default async function ProfilePage() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase!.from("user_accounts").select("status, people(full_name, preferred_name)").eq("auth_user_id", user!.id).maybeSingle();
  const person = data?.people as unknown as { full_name: string; preferred_name: string | null } | null;
  return <div className="profile-page"><div className="breadcrumbs"><span>Início</span><ChevronRight size={14} /><strong>Meu perfil</strong></div><section className="page-heading"><div><p className="page-overline">SUA CONTA</p><h1>Meu perfil</h1><p>Consulte as informações básicas da sua conta.</p></div></section><section className="profile-card"><div className="profile-card-heading"><span><CircleUserRound size={22} /></span><div><h2>Dados pessoais</h2><p>Informações vinculadas ao seu acesso CondoVia</p></div><span className="profile-status"><ShieldCheck size={15} /> {data?.status === "active" ? "Conta ativa" : "Status indisponível"}</span></div><div className="profile-fields"><div><span>Nome</span><strong>{person?.preferred_name || person?.full_name || "Não informado"}</strong></div><div><span>E-mail de acesso</span><strong>{user?.email || "Não informado"}</strong></div></div><p className="profile-note">Para corrigir seus dados pessoais, entre em contato com o responsável pela sua conta.</p></section></div>;
}
