"use server";

import { revalidatePath } from "next/cache";
import { requireUser, requireCurrentContext } from "@/lib/auth/context";
import { parseDateTimeInTimezone } from "@/lib/gatehouse/timezone";
import { normalizeVisitorDocumentNumber } from "@/lib/gatehouse/visitor-document";

export async function createVisitorAction(prevState: unknown, formData: FormData) {
  const { supabase, user } = await requireUser();
  if (!supabase || !user) return { error: "Não autenticado." };
  const context = await requireCurrentContext();
  if (context.type !== "condominium") return { error: "Contexto inválido." };

  const full_name = String(formData.get("full_name") || "").trim();
  const document_type = String(formData.get("document_type") || "").trim() || null;
  const document_number = normalizeVisitorDocumentNumber(document_type, String(formData.get("document_number") || ""));
  const phone = String(formData.get("phone") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;

  if (full_name.length < 2) {
    return { error: "Nome deve conter no mínimo 2 caracteres." };
  }

  const { data: account } = await supabase
    .from("user_accounts")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  const { error } = await supabase.from("visitors").insert({
    condominium_id: context.id,
    full_name,
    document_type,
    document_number,
    phone,
    notes,
    created_by: account?.id,
    updated_by: account?.id,
  });

  if (error) {
    if (error.code === "23505" && error.message.includes("visitors_document_duplicate")) {
      return { error: `Já existe um visitante cadastrado com este ${document_type === "cpf" ? "CPF" : "documento"}.` };
    }
    return { error: error.message };
  }

  revalidatePath("/app/gatehouse");
  revalidatePath("/app/gatehouse/visitors");
  return { success: true };
}

export async function createAccessPointAction(prevState: unknown, formData: FormData) {
  const { supabase, user } = await requireUser();
  if (!supabase || !user) return { error: "Não autenticado." };
  const context = await requireCurrentContext();
  if (context.type !== "condominium") return { error: "Contexto inválido." };

  const name = String(formData.get("name") || "").trim();
  const type = String(formData.get("type") || "").trim();
  if (name.length < 2) return { error: "Nome deve conter no mínimo 2 caracteres." };
  if (!["pedestrian", "vehicle", "service", "mixed"].includes(type)) return { error: "Tipo de acesso inválido." };

  const { error } = await supabase.from("access_points").insert({
    condominium_id: context.id,
    name,
    type,
    status: "active",
  });
  if (error) return { error: error.message };

  revalidatePath("/app/gatehouse");
  revalidatePath("/app/gatehouse/access-points");
  return { success: true };
}

export async function updateAccessPointAction(prevState: unknown, formData: FormData) {
  const { supabase, user } = await requireUser();
  if (!supabase || !user) return { error: "Não autenticado." };
  const context = await requireCurrentContext();
  if (context.type !== "condominium") return { error: "Contexto inválido." };

  const id = String(formData.get("id") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const type = String(formData.get("type") || "").trim();
  const status = String(formData.get("status") || "").trim();
  if (!id) return { error: "Ponto de acesso inválido." };
  if (name.length < 2) return { error: "Nome deve conter no mínimo 2 caracteres." };
  if (!["pedestrian", "vehicle", "service", "mixed"].includes(type)) return { error: "Tipo de acesso inválido." };
  if (!["active", "inactive"].includes(status)) return { error: "Status inválido." };

  const { error } = await supabase
    .from("access_points")
    .update({ name, type, status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("condominium_id", context.id);
  if (error) return { error: error.message };

  revalidatePath("/app/gatehouse");
  revalidatePath("/app/gatehouse/access-points");
  return { success: true };
}

export async function createProviderAction(prevState: unknown, formData: FormData) {
  const { supabase, user } = await requireUser();
  if (!supabase || !user) return { error: "Não autenticado." };
  const context = await requireCurrentContext();
  if (context.type !== "condominium") return { error: "Contexto inválido." };

  const full_name = String(formData.get("full_name") || "").trim();
  const company_name = String(formData.get("company_name") || "").trim() || null;
  const service_type = String(formData.get("service_type") || "").trim() || null;
  const document_type = String(formData.get("document_type") || "").trim() || null;
  const document_number = String(formData.get("document_number") || "").trim() || null;
  const phone = String(formData.get("phone") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;

  if (full_name.length < 2) {
    return { error: "Nome deve conter no mínimo 2 caracteres." };
  }

  const { data: account } = await supabase
    .from("user_accounts")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  const { error } = await supabase.from("service_providers").insert({
    condominium_id: context.id,
    full_name,
    company_name,
    service_type,
    document_type,
    document_number,
    phone,
    notes,
    created_by: account?.id,
    updated_by: account?.id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/app/gatehouse");
  revalidatePath("/app/gatehouse/providers");
  return { success: true };
}

export async function createAuthorizationAction(prevState: unknown, formData: FormData) {
  const { supabase, user } = await requireUser();
  if (!supabase || !user) return { error: "Não autenticado." };
  const context = await requireCurrentContext();
  if (context.type !== "condominium") return { error: "Contexto inválido." };

  const unit_id = String(formData.get("unit_id") || "").trim();
  const target_type = String(formData.get("target_type") || "visitor");
  const target_id = String(formData.get("target_id") || "").trim();
  const visitor_mode = String(formData.get("visitor_mode") || "").trim();
  const valid_from = String(formData.get("valid_from") || "").trim();
  const valid_until = String(formData.get("valid_until") || "").trim();
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!unit_id) return { error: "Selecione a unidade." };
  if (!visitor_mode && !target_id) return { error: "Selecione a pessoa (visitante ou prestador)." };
  if (!valid_from || !valid_until) return { error: "Defina o período de validade." };

  const { data: condo } = await supabase
    .from("condominiums")
    .select("timezone")
    .eq("id", context.id)
    .maybeSingle();
  const timeZone = condo?.timezone || "America/Sao_Paulo";

  let fromDate: Date;
  let untilDate: Date;
  try {
    fromDate = parseDateTimeInTimezone(valid_from, timeZone);
    untilDate = parseDateTimeInTimezone(valid_until, timeZone);
  } catch {
    return { error: "Data ou horário em formato inválido." };
  }

  if (fromDate >= untilDate) {
    return { error: "A data final deve ser posterior à data inicial." };
  }

  const validFromIso = fromDate.toISOString();
  const validUntilIso = untilDate.toISOString();

  const overlapTarget = visitor_mode === "recent" || !visitor_mode ? target_id : "";
  if (overlapTarget && !formData.get("allow_overlap")) {
    const targetColumn = target_type === "visitor" ? "visitor_id" : "service_provider_id";
    const { data: conflicts } = await supabase
      .from("access_authorizations")
      .select("valid_from, valid_until")
      .eq("condominium_id", context.id)
      .eq("unit_id", unit_id)
      .eq(targetColumn, overlapTarget)
      .in("status", ["approved", "pending"])
      .lt("valid_from", validUntilIso)
      .gt("valid_until", validFromIso)
      .order("valid_from", { ascending: true })
      .limit(1);
    if (conflicts?.[0]) return { overlap: conflicts[0] };
  }

  if (visitor_mode) {
    const full_name = String(formData.get("visitor_name") || "").trim();
    if (visitor_mode === "recent" && !target_id) return { error: "Selecione um visitante recente." };
    if (visitor_mode === "new" && full_name.length < 2) return { error: "Informe o nome do visitante." };
    const { error } = await supabase.rpc("create_resident_visitor_authorization", {
      p_unit_id: unit_id,
      p_valid_from: validFromIso,
      p_valid_until: validUntilIso,
      p_visitor_id: visitor_mode === "recent" ? target_id : null,
      p_full_name: visitor_mode === "new" ? full_name : null,
      p_document_type: visitor_mode === "new" ? String(formData.get("document_type") || "").trim() || null : null,
      p_document_number: visitor_mode === "new" ? String(formData.get("document_number") || "").trim() || null : null,
      p_phone: visitor_mode === "new" ? String(formData.get("phone") || "").trim() || null : null,
      p_notes: notes,
    });
    if (error) return { error: error.message };
    revalidatePath("/app/gatehouse");
    revalidatePath("/app/gatehouse/authorizations");
    revalidatePath("/app/my-units");
    return { success: true };
  }

  const { data: account } = await supabase
    .from("user_accounts")
    .select("id, person_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!account?.person_id) {
    return { error: "Pessoa não vinculada ao usuário logado." };
  }

  const payload: Record<string, unknown> = {
    condominium_id: context.id,
    unit_id,
    authorized_by_person_id: account.person_id,
    authorized_by_user_account_id: account.id,
    valid_from: validFromIso,
    valid_until: validUntilIso,
    status: "approved",
    notes,
  };

  if (target_type === "visitor") {
    payload.visitor_id = target_id;
    payload.service_provider_id = null;
  } else {
    payload.visitor_id = null;
    payload.service_provider_id = target_id;
  }

  const { error } = await supabase.from("access_authorizations").insert(payload);
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/app/gatehouse");
  revalidatePath("/app/gatehouse/authorizations");
  revalidatePath("/app/my-units");
  return { success: true };
}

export async function createAccessRequestAction(prevState: unknown, formData: FormData) {
  const { supabase, user } = await requireUser();
  if (!supabase || !user) return { error: "Não autenticado." };
  const context = await requireCurrentContext();
  if (context.type !== "condominium") return { error: "Contexto inválido." };

  const unit_id = String(formData.get("unit_id") || "").trim();
  const target_type = String(formData.get("target_type") || "visitor");
  const target_id = String(formData.get("target_id") || "").trim();
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!unit_id) return { error: "Selecione a unidade de destino." };
  if (!target_id) return { error: "Selecione a pessoa." };

  const { data: account } = await supabase
    .from("user_accounts")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!account) return { error: "Conta de usuário não encontrada." };

  const payload: Record<string, unknown> = {
    condominium_id: context.id,
    unit_id,
    requested_by_user_account_id: account.id,
    status: "pending",
    notes,
  };

  if (target_type === "visitor") {
    payload.visitor_id = target_id;
    payload.service_provider_id = null;
  } else {
    payload.visitor_id = null;
    payload.service_provider_id = target_id;
  }

  const { error } = await supabase.from("access_requests").insert(payload);
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/app/gatehouse");
  revalidatePath("/app/gatehouse/authorizations");
  revalidatePath("/app/my-units");
  return { success: true };
}

export async function decideAccessRequestAction(prevState: unknown, formData: FormData) {
  const { supabase } = await requireUser();
  if (!supabase) return { error: "Não autenticado." };

  const request_id = String(formData.get("request_id") || "").trim();
  const decision = String(formData.get("decision") || "").trim();
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!request_id) return { error: "ID da solicitação não fornecido." };
  if (decision !== "approved" && decision !== "denied") {
    return { error: "Decisão inválida." };
  }

  const { error } = await supabase.rpc("decide_access_request", {
    p_request_id: request_id,
    p_decision: decision,
    p_notes: notes,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/app/gatehouse");
  revalidatePath("/app/gatehouse/authorizations");
  revalidatePath("/app/my-units");
  return { success: true };
}

export async function registerEntryAction(prevState: unknown, formData: FormData) {
  const { supabase } = await requireUser();
  if (!supabase) return { error: "Não autenticado." };
  const context = await requireCurrentContext();
  if (context.type !== "condominium") return { error: "Contexto inválido." };

  const authorization_id = String(formData.get("authorization_id") || "").trim();
  const access_point_id = String(formData.get("access_point_id") || "").trim();
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!authorization_id) return { error: "Selecione a autorização." };
  if (!access_point_id) return { error: "Selecione o ponto de acesso." };

  const { error } = await supabase.rpc("register_access_entry", {
    p_condominium_id: context.id,
    p_authorization_id: authorization_id,
    p_access_point_id: access_point_id,
    p_notes: notes,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/app/gatehouse");
  revalidatePath("/app/gatehouse/access");
  revalidatePath("/app/gatehouse/history");
  return { success: true };
}

export async function registerExitAction(prevState: unknown, formData: FormData) {
  const { supabase } = await requireUser();
  if (!supabase) return { error: "Não autenticado." };
  const context = await requireCurrentContext();
  if (context.type !== "condominium") return { error: "Contexto inválido." };

  const target_type = String(formData.get("target_type") || "").trim();
  const target_id = String(formData.get("target_id") || "").trim();
  const access_point_id = String(formData.get("access_point_id") || "").trim();
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!target_id) return { error: "Informe a pessoa saindo." };
  if (!access_point_id) return { error: "Selecione o ponto de acesso de saída." };

  const visitor_id = target_type === "visitor" ? target_id : null;
  const service_provider_id = target_type === "provider" ? target_id : null;

  const { error } = await supabase.rpc("register_access_exit", {
    p_condominium_id: context.id,
    p_visitor_id: visitor_id,
    p_service_provider_id: service_provider_id,
    p_access_point_id: access_point_id,
    p_notes: notes,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/app/gatehouse");
  revalidatePath("/app/gatehouse/access");
  revalidatePath("/app/gatehouse/history");
  return { success: true };
}

export async function receivePackageAction(prevState: unknown, formData: FormData) {
  const { supabase, user } = await requireUser();
  if (!supabase || !user) return { error: "Não autenticado." };
  const context = await requireCurrentContext();
  if (context.type !== "condominium") return { error: "Contexto inválido." };

  const unit_id = String(formData.get("unit_id") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const carrier = String(formData.get("carrier") || "").trim() || null;
  const recipient_person_id = String(formData.get("recipient_person_id") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!unit_id) return { error: "Selecione a unidade da encomenda." };
  if (description.length < 2) return { error: "Descrição deve conter no mínimo 2 caracteres." };

  const { data: account } = await supabase
    .from("user_accounts")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!account) return { error: "Conta de usuário não encontrada." };

  const { error } = await supabase.from("packages").insert({
    condominium_id: context.id,
    unit_id,
    description,
    carrier,
    recipient_person_id,
    received_by_user_account_id: account.id,
    status: "received",
    notes,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/app/gatehouse");
  revalidatePath("/app/gatehouse/packages");
  revalidatePath("/app/my-units");
  return { success: true };
}

export async function collectPackageAction(prevState: unknown, formData: FormData) {
  const { supabase } = await requireUser();
  if (!supabase) return { error: "Não autenticado." };

  const package_id = String(formData.get("package_id") || "").trim();
  const collector_name = String(formData.get("collector_name") || "").trim() || null;
  const collector_document = String(formData.get("collector_document") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!package_id) return { error: "Selecione a encomenda para liberação." };

  const { error } = await supabase.rpc("collect_package", {
    p_package_id: package_id,
    p_collector_name: collector_name,
    p_collector_document: collector_document,
    p_notes: notes,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/app/gatehouse");
  revalidatePath("/app/gatehouse/packages");
  revalidatePath("/app/my-units");
  return { success: true };
}
