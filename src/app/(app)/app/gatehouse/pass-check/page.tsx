import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireCurrentContext, requireUser } from "@/lib/auth/context";
import { GatehouseNav } from "@/components/gatehouse/gatehouse-nav";
import { PassCheckScanner } from "@/components/gatehouse/pass-check-scanner";
import { getAccessPoints } from "@/lib/gatehouse/data";

export const metadata = { title: "Validar Passe — Portaria" };

export default async function PassCheckPage() {
  const { supabase, user } = await requireUser();
  if (!supabase || !user) return null;
  const context = await requireCurrentContext();
  const accessPoints = await getAccessPoints(context.id);

  return (
    <div className="cv-page gatehouse-v2">
      <div className="breadcrumbs">
        <Link href="/app/dashboard">Início</Link>
        <ChevronRight size={14} />
        <Link href="/app/gatehouse">Portaria</Link>
        <ChevronRight size={14} />
        <strong>Validar passe</strong>
      </div>

      <section className="v2-page-header">
        <div>
          <p className="page-overline">PORTARIA</p>
          <h1>Validar passe — {context.name}</h1>
          <p>Leia o QR Code do visitante ou cole o link do passe para conferir a validade. A consulta não registra entrada nem saída.</p>
        </div>
      </section>

      <GatehouseNav />

      <PassCheckScanner accessPoints={accessPoints.map((point) => ({ id: point.id, name: point.name, type: point.type }))} />
    </div>
  );
}
