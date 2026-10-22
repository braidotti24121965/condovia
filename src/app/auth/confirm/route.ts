import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { defaultNextFor, parseEmailOtpType, safeNextPath } from "@/lib/auth/email-link";

// Confirmação de links de e-mail (recuperação de senha e afins) via token_hash.
// Diferente de /auth/callback (PKCE), não depende de cookie do navegador que
// solicitou o e-mail: o link funciona em qualquer navegador ou dispositivo.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = parseEmailOtpType(url.searchParams.get("type"));
  const fail = () => {
    const response = NextResponse.redirect(new URL("/login?error=link", url.origin));
    response.headers.set("Cache-Control", "no-store");
    return response;
  };
  if (!tokenHash || !type) return fail();
  const supabase = await createClient();
  if (!supabase) return fail();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) return fail();
  const response = NextResponse.redirect(new URL(safeNextPath(url.searchParams.get("next"), defaultNextFor(type)), url.origin));
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
