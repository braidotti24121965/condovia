import { requireUser } from "@/lib/auth/context";
import type {
  Visitor,
  ServiceProvider,
  AccessPoint,
  AccessRequest,
  AccessAuthorization,
  GatehousePresence,
  AccessEvent,
  Package,
  GatehouseDashboardSummary,
} from "./types";

export function filterActiveAccessPoints(points: AccessPoint[], condominiumId: string): AccessPoint[] {
  return points.filter((point) => point.condominium_id === condominiumId && point.status === "active");
}

export async function getGatehousePresence(condominiumId: string): Promise<GatehousePresence[]> {
  const { supabase } = await requireUser();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("get_gatehouse_presence", {
    p_condominium_id: condominiumId,
  });

  if (error) {
    console.error("Error fetching gatehouse presence:", error);
    return [];
  }

  return (data || []) as GatehousePresence[];
}

export async function getGatehouseDashboardSummary(condominiumId: string): Promise<GatehouseDashboardSummary> {
  const { supabase } = await requireUser();
  if (!supabase) {
    return {
      insideNowCount: 0,
      authorizationsTodayCount: 0,
      pendingRequestsCount: 0,
      waitingPackagesCount: 0,
      presenceList: [],
      expectedArrivals: [],
      pendingRequests: [],
      recentPackages: [],
    };
  }

  const nowUtc = new Date().toISOString();

  const [presenceRes, authsTodayRes, requestsRes, packagesRes] = await Promise.all([
    supabase.rpc("get_gatehouse_presence", { p_condominium_id: condominiumId }),
    supabase
      .from("access_authorizations")
      .select("*, unit:units(id, code, display_name), visitor:visitors(id, full_name), service_provider:service_providers(id, full_name, company_name)")
      .eq("condominium_id", condominiumId)
      .eq("status", "approved")
      .lte("valid_from", nowUtc)
      .gte("valid_until", nowUtc)
      .order("valid_from", { ascending: true }),
    supabase
      .from("access_requests")
      .select("*, unit:units(id, code, display_name), visitor:visitors(id, full_name), service_provider:service_providers(id, full_name, company_name)")
      .eq("condominium_id", condominiumId)
      .eq("status", "pending")
      .order("requested_at", { ascending: false }),
    supabase
      .from("packages")
      .select("*, unit:units(id, code, display_name), recipient:people(id, full_name)")
      .eq("condominium_id", condominiumId)
      .eq("status", "received")
      .order("received_at", { ascending: false }),
  ]);

  const presenceList = (presenceRes.data || []) as GatehousePresence[];
  const authorizationsToday = (authsTodayRes.data || []) as unknown as AccessAuthorization[];
  const pendingRequests = (requestsRes.data || []) as unknown as AccessRequest[];
  const waitingPackages = (packagesRes.data || []) as unknown as Package[];

  // Expected arrivals: authorizations active today where visitor/provider is not currently inside
  const insideTargetIds = new Set(presenceList.map((p) => p.target_id));
  const expectedArrivals = authorizationsToday.filter((a) => {
    const targetId = a.visitor_id || a.service_provider_id;
    return targetId && !insideTargetIds.has(targetId);
  });

  return {
    insideNowCount: presenceList.length,
    authorizationsTodayCount: authorizationsToday.length,
    pendingRequestsCount: pendingRequests.length,
    waitingPackagesCount: waitingPackages.length,
    presenceList,
    expectedArrivals,
    pendingRequests,
    recentPackages: waitingPackages.slice(0, 10),
  };
}

export async function getVisitors(condominiumId: string, search?: string): Promise<Visitor[]> {
  const { supabase } = await requireUser();
  if (!supabase) return [];

  let query = supabase
    .from("visitors")
    .select("*")
    .eq("condominium_id", condominiumId)
    .order("full_name", { ascending: true });

  if (search && search.trim().length > 0) {
    const term = search.trim();
    query = query.or(`full_name.ilike.%${term}%,document_number.ilike.%${term}%,phone.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching visitors:", error);
    return [];
  }
  return (data || []) as Visitor[];
}

export async function getResidentRecentVisitors(): Promise<Visitor[]> {
  const { supabase } = await requireUser();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("get_resident_recent_visitors");
  if (error) {
    console.error("Error fetching resident recent visitors:", error);
    return [];
  }
  return (data || []) as Visitor[];
}

export async function getServiceProviders(condominiumId: string, search?: string): Promise<ServiceProvider[]> {
  const { supabase } = await requireUser();
  if (!supabase) return [];

  let query = supabase
    .from("service_providers")
    .select("*")
    .eq("condominium_id", condominiumId)
    .order("full_name", { ascending: true });

  if (search && search.trim().length > 0) {
    const term = search.trim();
    query = query.or(`full_name.ilike.%${term}%,company_name.ilike.%${term}%,document_number.ilike.%${term}%,service_type.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching service providers:", error);
    return [];
  }
  return (data || []) as ServiceProvider[];
}

export async function getAccessPoints(condominiumId: string): Promise<AccessPoint[]> {
  const { supabase } = await requireUser();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("access_points")
    .select("*")
    .eq("condominium_id", condominiumId)
    .eq("status", "active")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching access points:", error);
    return [];
  }
  return filterActiveAccessPoints((data || []) as AccessPoint[], condominiumId);
}

export async function getAllAccessPoints(condominiumId: string): Promise<AccessPoint[]> {
  const { supabase } = await requireUser();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("access_points")
    .select("*")
    .eq("condominium_id", condominiumId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching all access points:", error);
    return [];
  }
  return (data || []) as AccessPoint[];
}

export async function getAccessAuthorizations(
  condominiumId: string,
  options?: { unitId?: string; status?: string }
): Promise<AccessAuthorization[]> {
  const { supabase } = await requireUser();
  if (!supabase) return [];

  let query = supabase
    .from("access_authorizations")
    .select("*, unit:units(id, code, display_name), visitor:visitors(id, full_name, document_type, document_number, phone), service_provider:service_providers(id, full_name, company_name, document_type, document_number, phone)")
    .eq("condominium_id", condominiumId)
    .order("valid_from", { ascending: false });

  if (options?.unitId) {
    query = query.eq("unit_id", options.unitId);
  }
  if (options?.status) {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching authorizations:", error);
    return [];
  }
  return (data || []) as unknown as AccessAuthorization[];
}

export async function getAccessRequests(
  condominiumId: string,
  options?: { unitId?: string; status?: string }
): Promise<AccessRequest[]> {
  const { supabase } = await requireUser();
  if (!supabase) return [];

  let query = supabase
    .from("access_requests")
    .select("*, unit:units(id, code, display_name), visitor:visitors(id, full_name, document_type, document_number, phone), service_provider:service_providers(id, full_name, company_name, document_type, document_number, phone)")
    .eq("condominium_id", condominiumId)
    .order("requested_at", { ascending: false });

  if (options?.unitId) {
    query = query.eq("unit_id", options.unitId);
  }
  if (options?.status) {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching access requests:", error);
    return [];
  }
  return (data || []) as unknown as AccessRequest[];
}

export async function getPackages(
  condominiumId: string,
  options?: { unitId?: string; status?: string }
): Promise<Package[]> {
  const { supabase } = await requireUser();
  if (!supabase) return [];

  let query = supabase
    .from("packages")
    .select("*, unit:units(id, code, display_name), recipient:people(id, full_name), collection:package_collections(*)")
    .eq("condominium_id", condominiumId)
    .order("received_at", { ascending: false });

  if (options?.unitId) {
    query = query.eq("unit_id", options.unitId);
  }
  if (options?.status) {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching packages:", error);
    return [];
  }
  return (data || []) as unknown as Package[];
}

export async function getAccessEvents(condominiumId: string, limit = 50): Promise<AccessEvent[]> {
  const { supabase } = await requireUser();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("access_events")
    .select("*, unit:units(id, code), access_point:access_points(id, name), visitor:visitors(id, full_name), service_provider:service_providers(id, full_name, company_name)")
    .eq("condominium_id", condominiumId)
    .order("occurred_at", { ascending: false })
    .order("sequence_number", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching access events:", error);
    return [];
  }
  return (data || []) as unknown as AccessEvent[];
}

export async function getCondoUnits(condominiumId: string) {
  const { supabase } = await requireUser();
  if (!supabase) return [];

  const { data } = await supabase.rpc("get_gatehouse_units", {
    p_condominium_id: condominiumId,
  });

  return data || [];
}
