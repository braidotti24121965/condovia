import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const inviteToken = url.searchParams.get("invite_token");
  const adminInviteToken = url.searchParams.get("admin_invite_token");
  const requestedPath = url.searchParams.get("next") ?? "/app";
  const nextPath = requestedPath.startsWith("/") && !requestedPath.startsWith("//") ? requestedPath : "/app";
  const supabase = await createClient();
  // Admin email invitations return an implicit session in the URL fragment.
  // Fragments never reach the server; the browser must establish that session.
  if (!code && ((inviteToken && /^[0-9a-f]{64}$/.test(inviteToken)) || (adminInviteToken && /^[0-9a-f]{64}$/.test(adminInviteToken)))) {
    const target = new URL("/auth/activate", url.origin);
    if (adminInviteToken) target.searchParams.set("admin_invite_token", adminInviteToken);
    else target.searchParams.set("invite_token", inviteToken!);
    const response = NextResponse.redirect(target);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }
  if (!code || !supabase) return NextResponse.redirect(new URL("/login?error=auth", url.origin));
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/login?error=auth", url.origin));
  if (inviteToken) {
    const { data: condominiumId, error: inviteError } = await supabase.rpc("accept_resident_invitation", { p_token: inviteToken });
    if (inviteError || typeof condominiumId !== "string") {
      await supabase.auth.signOut();
      const response = NextResponse.redirect(new URL("/login?error=invitation", url.origin));
      response.headers.set("Cache-Control", "no-store");
      return response;
    }
    const { data: accountReady, error: accountError } = await supabase.rpc("record_user_login");
    if (accountError || accountReady !== true) {
      await supabase.auth.signOut();
      const response = NextResponse.redirect(new URL("/login?error=invitation", url.origin));
      response.headers.set("Cache-Control", "no-store");
      return response;
    }
    const cookieStore = await cookies();
    cookieStore.set("condovia_context", condominiumId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    const response = NextResponse.redirect(new URL("/app/my-units", url.origin));
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }
  if (adminInviteToken) {
    const { data: condominiumId, error: inviteError } = await supabase.rpc("accept_initial_condominium_admin_invitation", { p_token: adminInviteToken });
    if (inviteError || typeof condominiumId !== "string") {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?error=invitation", url.origin));
    }
    const { data: accountReady } = await supabase.rpc("record_user_login");
    if (accountReady !== true) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?error=invitation", url.origin));
    }
    const cookieStore = await cookies();
    cookieStore.set("condovia_context", condominiumId, { httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*12 });
    return NextResponse.redirect(new URL("/app/dashboard", url.origin));
  }
  return NextResponse.redirect(new URL(nextPath, url.origin));
}
