import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Links enviados pelo Supabase (recuperação de senha, convite, confirmação) chegam com token_hash, não com code.
const OTP_TYPES: EmailOtpType[] = ["recovery", "signup", "invite", "email", "email_change", "magiclink"];

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const requestedPath = url.searchParams.get("next") ?? "/app";
  const nextPath = requestedPath.startsWith("/") && !requestedPath.startsWith("//") ? requestedPath : "/app";

  if (!tokenHash || !type || !OTP_TYPES.includes(type)) return NextResponse.redirect(new URL("/login?error=auth", url.origin));

  const supabase = await createClient();
  if (!supabase) return NextResponse.redirect(new URL("/login?error=auth", url.origin));
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) return NextResponse.redirect(new URL("/login?error=auth", url.origin));

  const response = NextResponse.redirect(new URL(nextPath, url.origin));
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
