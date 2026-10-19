import type { Metadata } from "next";
import { ChevronRight, CircleUserRound, ShieldCheck } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { ProfileEditor } from "@/components/profile/profile-editor";
import { requireUser } from "@/lib/auth/context";

export const metadata: Metadata = { title: "Meu perfil" };

export default async function ProfilePage() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase!.from("user_accounts").select("status").eq("auth_user_id", user!.id).maybeSingle();
  const { data: displayName } = await supabase!.rpc("get_my_display_name");
  return <div className="profile-page"><div className="breadcrumbs"><span>Início</span><ChevronRight size={14} /><strong>Meu perfil</strong></div><section className="page-heading"><div><p className="page-overline">SUA CONTA</p><h1>Meu perfil</h1><p>Consulte as informações básicas da sua conta.</p></div></section><section className="profile-card"><div className="profile-card-heading"><span><CircleUserRound size={22} /></span><div><h2>Dados pessoais</h2><p>Informações vinculadas ao seu acesso CondoVia</p></div><StatusBadge variant={data?.status === "active" ? "success" : "neutral"}><ShieldCheck size={15} /> {data?.status === "active" ? "Conta ativa" : "Status indisponível"}</StatusBadge></div><ProfileEditor displayName={displayName || ""} email={user?.email || ""} /><p className="profile-note">O e-mail de acesso permanece somente leitura.</p></section></div>;
}
