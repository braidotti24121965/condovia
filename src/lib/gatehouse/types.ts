export type DocumentType = 'cpf' | 'rg' | 'cnh' | 'passport' | 'other';

export interface Visitor {
  id: string;
  condominium_id: string;
  full_name: string;
  document_type: DocumentType | null;
  document_number: string | null;
  phone: string | null;
  notes: string | null;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface ServiceProvider {
  id: string;
  condominium_id: string;
  full_name: string;
  document_type: DocumentType | null;
  document_number: string | null;
  phone: string | null;
  company_name: string | null;
  service_type: string | null;
  notes: string | null;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface AccessPoint {
  id: string;
  condominium_id: string;
  name: string;
  type: 'pedestrian' | 'vehicle' | 'service' | 'mixed';
  status: 'active' | 'inactive';
}

export interface AccessRequest {
  id: string;
  condominium_id: string;
  unit_id: string;
  visitor_id: string | null;
  service_provider_id: string | null;
  requested_by_user_account_id: string;
  requested_at: string;
  status: 'pending' | 'approved' | 'denied' | 'cancelled';
  decided_by_person_id: string | null;
  decided_at: string | null;
  notes: string | null;
  unit?: { id: string; code: string; display_name: string | null };
  visitor?: Visitor | null;
  service_provider?: ServiceProvider | null;
}

export interface AccessAuthorization {
  id: string;
  condominium_id: string;
  unit_id: string;
  visitor_id: string | null;
  service_provider_id: string | null;
  authorized_by_person_id: string;
  valid_from: string;
  valid_until: string;
  status: 'pending' | 'approved' | 'denied' | 'cancelled';
  notes: string | null;
  unit?: { id: string; code: string; display_name: string | null };
  visitor?: Visitor | null;
  service_provider?: ServiceProvider | null;
}

export interface GatehousePresence {
  target_kind: 'visitor' | 'provider';
  target_id: string;
  full_name: string;
  document_type: string | null;
  document_number: string | null;
  company_name: string | null;
  unit_id: string;
  unit_code: string;
  authorization_id: string;
  access_point_id: string;
  access_point_name: string;
  entered_at: string;
}

export interface AccessEvent {
  id: string;
  condominium_id: string;
  access_point_id: string;
  visitor_id: string | null;
  service_provider_id: string | null;
  authorization_id: string;
  access_request_id: string | null;
  unit_id: string;
  event_type: 'entry' | 'exit';
  occurred_at: string;
  notes: string | null;
  sequence_number: number;
  unit?: { id: string; code: string };
  access_point?: { id: string; name: string };
  visitor?: { id: string; full_name: string };
  service_provider?: { id: string; full_name: string; company_name: string | null };
}

export interface Package {
  id: string;
  condominium_id: string;
  unit_id: string;
  recipient_person_id: string | null;
  carrier: string | null;
  description: string;
  received_at: string;
  status: 'received' | 'collected';
  notes: string | null;
  unit?: { id: string; code: string; display_name: string | null };
  recipient?: { id: string; full_name: string } | null;
  collection?: PackageCollection | null;
}

export interface PackageCollection {
  id: string;
  package_id: string;
  condominium_id: string;
  collected_at: string;
  collected_by_person_id: string | null;
  collector_name: string | null;
  collector_document: string | null;
  notes: string | null;
}

export interface GatehouseDashboardSummary {
  insideNowCount: number;
  authorizationsTodayCount: number;
  pendingRequestsCount: number;
  waitingPackagesCount: number;
  presenceList: GatehousePresence[];
  expectedArrivals: AccessAuthorization[];
  pendingRequests: AccessRequest[];
  recentPackages: Package[];
}
