import Link from "next/link";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import { TenantForm } from "@/components/platform/tenant-form";
import { requirePlatformPermission } from "@/lib/platform/access";

export const metadata = { title: "Novo tenant" };

export default async function NewTenantPage() {
  await requirePlatformPermission("platform.tenants.onboard");
  return <div className="cv-page">
    <div className="breadcrumbs"><Link href="/app/platform"><ChevronLeft size={14}/> Plataforma</Link><strong>Novo tenant</strong></div>
    <section className="page-heading"><div><p className="page-overline">ONBOARDING</p><h1>Cadastrar tenant</h1><p>Crie o cliente, o condomínio e prepare o convite do síndico inicial.</p></div><span className="role-badge"><ShieldCheck size={15}/> platform.admin</span></section>
    <section className="cv-panel"><TenantForm/></section>
  </div>;
}
