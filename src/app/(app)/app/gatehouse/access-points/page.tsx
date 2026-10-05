import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireCurrentContext, requireUser } from "@/lib/auth/context";
import { EmptyState } from "@/components/ui/feedback";
import { GatehouseNav } from "@/components/gatehouse/gatehouse-nav";
import { AccessPointForm } from "@/components/gatehouse/access-point-form";
import { AccessPointList } from "@/components/gatehouse/access-point-list";
import { getAllAccessPoints } from "@/lib/gatehouse/data";

export const metadata = { title: "Pontos de acesso — Portaria" };

export default async function AccessPointsPage() {
  const { supabase, user } = await requireUser();
  if (!supabase || !user) return null;
  const context = await requireCurrentContext();
  if (context.type !== "condominium") return <EmptyState title="Selecione um condomínio" description="Acesse o contexto de um condomínio para administrar os pontos de acesso." />;
  const accessPoints = await getAllAccessPoints(context.id);

  return <div className="cv-page"><div className="breadcrumbs"><Link href="/app/dashboard">Início</Link><ChevronRight size={14} /><Link href="/app/gatehouse">Portaria</Link><ChevronRight size={14} /><strong>Pontos de acesso</strong></div><section className="page-heading"><div><p className="page-overline">CONFIGURAÇÃO DA PORTARIA</p><h1>Pontos de acesso</h1><p>Cadastre e desative os locais usados para registrar entradas e saídas.</p></div><AccessPointForm /></section><GatehouseNav /><section className="cv-panel">{accessPoints.length === 0 ? <EmptyState title="Nenhum ponto de acesso cadastrado" description="Cadastre o primeiro ponto para liberar o registro de entradas." /> : <AccessPointList accessPoints={accessPoints} />}</section></div>;
}
