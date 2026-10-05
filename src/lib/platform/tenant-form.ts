import { normalizePostalCode, validateBrazilianCnpj } from "@/lib/condominium/format";

export const tenantFieldNames = [
  "client_legal_name", "condominium_name", "condominium_legal_name", "document_number",
  "condominium_type", "condominium_email", "condominium_phone", "timezone", "postal_code",
  "street", "number", "complement", "district", "city", "state", "country_code",
  "admin_name", "admin_email", "admin_phone",
] as const;

export type TenantFieldName = typeof tenantFieldNames[number];
export type TenantFormValues = Record<TenantFieldName, string>;
export type TenantFieldErrors = Partial<Record<TenantFieldName, string>>;
export type TenantActionState = { values: TenantFormValues; fieldErrors: TenantFieldErrors; message?: string };

export const initialTenantValues: TenantFormValues = {
  client_legal_name: "", condominium_name: "", condominium_legal_name: "", document_number: "",
  condominium_type: "other", condominium_email: "", condominium_phone: "", timezone: "America/Sao_Paulo",
  postal_code: "", street: "", number: "", complement: "", district: "", city: "", state: "",
  country_code: "BR", admin_name: "", admin_email: "", admin_phone: "",
};

export const initialTenantState: TenantActionState = { values: initialTenantValues, fieldErrors: {} };

export function tenantValuesFromForm(form: FormData): TenantFormValues {
  return Object.fromEntries(tenantFieldNames.map((name) => [name, String(form.get(name) ?? "")])) as TenantFormValues;
}

export function validateTenantValues(values: TenantFormValues): TenantFieldErrors {
  const errors: TenantFieldErrors = {};
  const required: TenantFieldName[] = ["client_legal_name", "condominium_name", "timezone", "admin_name", "admin_email"];
  for (const name of required) if (!values[name].trim()) errors[name] = "Este campo é obrigatório.";
  if (values.document_number && !validateBrazilianCnpj(values.document_number)) errors.document_number = "Informe um CNPJ válido.";
  const cep = normalizePostalCode(values.postal_code);
  if (values.postal_code && cep.length !== 8) errors.postal_code = "Informe um CEP válido.";
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (values.condominium_email && !email.test(values.condominium_email.trim())) errors.condominium_email = "Informe um e-mail válido.";
  if (values.admin_email && !email.test(values.admin_email.trim())) errors.admin_email = "Informe um e-mail válido.";
  const hasAddress = ["postal_code", "street", "number", "complement", "district", "city", "state"].some((name) => values[name as TenantFieldName].trim());
  if (hasAddress) {
    for (const name of ["street", "city", "state"] as const) if (!values[name].trim()) errors[name] = "Este campo é obrigatório.";
  }
  if (!/^[A-Za-z]{2}$/.test(values.country_code.trim())) errors.country_code = "Informe um país válido.";
  return errors;
}

export function mapTenantServerError(message?: string): Pick<TenantActionState, "fieldErrors" | "message"> {
  const value = message?.toLowerCase() ?? "";
  if (value.includes("cnpj") || value.includes("document_number")) return { fieldErrors: { document_number: "Informe um CNPJ válido." } };
  if (value.includes("postal") || value.includes("cep")) return { fieldErrors: { postal_code: "Informe um CEP válido." } };
  if (value.includes("email")) return { fieldErrors: { admin_email: "Informe um e-mail válido." } };
  if (value.includes("timezone")) return { fieldErrors: { timezone: "Informe um fuso horário válido." } };
  return { fieldErrors: {}, message: "Não foi possível concluir o onboarding. Revise os dados e tente novamente." };
}
