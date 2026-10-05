import Link from "next/link";
import { ChevronRight, House } from "lucide-react";
import { requireCurrentContext, requireUser } from "@/lib/auth/context";
import { EmptyState } from "@/components/ui/feedback";
import { todayInTimezone } from "@/lib/condominium/people-data";
import { ResidentGatehouseSection } from "@/components/gatehouse/resident-gatehouse-section";
import {
  getAccessAuthorizations,
  getAccessRequests,
  getPackages,
  getResidentRecentVisitors,
} from "@/lib/gatehouse/data";

export const metadata = { title: "Minhas Unidades" };

export default async function MyUnitsPage() {
  const { supabase, user } = await requireUser();
  if (!supabase || !user) return null;
  const context = await requireCurrentContext();
  if (context.type !== "condominium") {
    return (
      <div className="cv-page">
        <h1>Minhas Unidades</h1>
        <EmptyState
          title="Selecione um condomínio"
          description="Troque para um contexto de condomínio para consultar seus vínculos."
        />
      </div>
    );
  }

  const [{ data: account }, { data: condo }] = await Promise.all([
    supabase
      .from("user_accounts")
      .select("person_id")
      .eq("auth_user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
    supabase.from("condominiums").select("timezone").eq("id", context.id).maybeSingle(),
  ]);

  if (!account) {
    return (
      <EmptyState
        title="Acesso indisponível"
        description="Não foi possível validar sua conta neste condomínio."
      />
    );
  }

  const today = todayInTimezone(condo?.timezone || "America/Sao_Paulo");
  const [{ data: occupancies }, { data: ownerships }, { data: financial }] = await Promise.all([
    supabase
      .from("unit_occupancies")
      .select("unit_id,starts_at,ends_at,occupancy_type,is_primary")
      .eq("person_id", account.person_id)
      .eq("condominium_id", context.id),
    supabase
      .from("unit_ownerships")
      .select("unit_id,starts_at,ends_at,ownership_percentage")
      .eq("person_id", account.person_id)
      .eq("condominium_id", context.id),
    supabase
      .from("unit_financial_responsibilities")
      .select("unit_id,starts_at,ends_at")
      .eq("person_id", account.person_id)
      .eq("condominium_id", context.id),
  ]);

  const currentOccupancies = (occupancies || []).filter(
    (r) => r.starts_at <= today && (!r.ends_at || r.ends_at > today)
  );
  const currentOwnerships = (ownerships || []).filter(
    (r) => r.starts_at <= today && (!r.ends_at || r.ends_at > today)
  );
  const currentFinancial = (financial || []).filter(
    (r) => r.starts_at <= today && (!r.ends_at || r.ends_at > today)
  );

  const occupancyLabels: Record<string, string> = {
    owner: "Morador proprietário",
    tenant: "Inquilino",
    family_member: "Familiar",
    dependent: "Dependente",
    other: "Outro morador",
  };

  // Explicit rule: Only active occupancy or active ownership grants resident unit access.
  // Financial responsibility alone does NOT grant access.
  const unitIds = [...new Set([...currentOccupancies, ...currentOwnerships].map((r) => r.unit_id))];

  const { data: units } = unitIds.length
    ? await supabase
        .from("units")
        .select("id,code,display_name,unit_type")
        .eq("condominium_id", context.id)
        .in("id", unitIds)
    : { data: [] };

  const byId = new Map((units || []).map((u) => [u.id, u]));

  // If resident has eligible units, fetch gatehouse data for their units
  const [authorizations, requests, packages, visitors, providers] = unitIds.length
    ? await Promise.all([
        getAccessAuthorizations(context.id),
        getAccessRequests(context.id),
        getPackages(context.id),
        getResidentRecentVisitors(),
        Promise.resolve([]),
      ])
    : [[], [], [], [], []];

  // Filter to resident's eligible units
  const eligibleUnitSet = new Set(unitIds);
  const residentAuthorizations = authorizations.filter((a) => eligibleUnitSet.has(a.unit_id));
  const residentRequests = requests.filter((r) => eligibleUnitSet.has(r.unit_id));
  const residentPackages = packages.filter((p) => eligibleUnitSet.has(p.unit_id));

  return (
    <div className="cv-page">
      <div className="breadcrumbs">
        <Link href="/app/dashboard">Início</Link>
        <ChevronRight size={14} />
        <strong>Minhas Unidades</strong>
      </div>

      <section className="page-heading">
        <div>
          <p className="page-overline">ACESSO DO MORADOR</p>
          <h1>Minhas Unidades</h1>
          <p>Unidades com propriedade ou moradia vigente em {context.name}.</p>
        </div>
      </section>

      {!unitIds.length ? (
        <EmptyState
          title="Nenhuma unidade vinculada"
          description="Quando houver uma propriedade ou moradia vigente associada à sua pessoa, ela aparecerá aqui."
        />
      ) : (
        <>
          <div className="cv-my-units">
            {unitIds.map((id) => {
              const u = byId.get(id);
              if (!u) return null;
              const occupancy = currentOccupancies.find((r) => r.unit_id === id);
              const ownership = currentOwnerships.find((r) => r.unit_id === id);
              const financialResponsibility = currentFinancial.some((r) => r.unit_id === id);
              return (
                <article className="cv-panel cv-my-unit" key={id}>
                  <span className="cv-my-unit-icon">
                    <House size={20} />
                  </span>
                  <div>
                    <h2>{u.display_name || u.code}</h2>
                    <p>
                      {u.code} · {u.unit_type}
                    </p>
                    <div className="cv-chip-row">
                      {occupancy && (
                        <span className="cv-status cv-status-active">
                          {occupancyLabels[occupancy.occupancy_type] || "Morador"}
                          {occupancy.is_primary ? " · Principal" : ""}
                        </span>
                      )}
                      {ownership && (
                        <span className="cv-status cv-status-active">
                          Proprietário
                          {ownership.ownership_percentage === null
                            ? ""
                            : ` · ${ownership.ownership_percentage}%`}
                        </span>
                      )}
                      {financialResponsibility && (
                        <span className="cv-status cv-status-active">Responsável financeiro</span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <ResidentGatehouseSection
            units={(units || []).map((u) => ({
              id: u.id,
              code: u.code,
              display_name: u.display_name,
            }))}
            visitors={visitors}
            providers={providers}
            authorizations={residentAuthorizations}
            requests={residentRequests}
            packages={residentPackages}
            timeZone={condo?.timezone || "America/Sao_Paulo"}
          />
        </>
      )}
    </div>
  );
}
