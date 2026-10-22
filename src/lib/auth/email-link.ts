import type { EmailOtpType } from "@supabase/supabase-js";

const allowedTypes: readonly EmailOtpType[] = ["recovery", "signup", "invite", "magiclink", "email", "email_change"];

export function parseEmailOtpType(value: string | null): EmailOtpType | null {
  return value && (allowedTypes as readonly string[]).includes(value) ? (value as EmailOtpType) : null;
}

/** Aceita apenas caminhos internos ("/x"), nunca URLs absolutas nem "//host". */
export function safeNextPath(value: string | null, fallback = "/app"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}

/** Destino padrão por tipo de link quando o e-mail não informa "next". */
export function defaultNextFor(type: EmailOtpType): string {
  return type === "recovery" ? "/reset-password" : "/app";
}
