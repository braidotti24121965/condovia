"use client";

import { useEffect, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { completeInitialAdminInvitation, completeResidentInvitation } from "@/lib/auth/invitation-actions";

export default function ActivateInvitationPage() {
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const url = new URL(window.location.href);
    const adminToken = url.searchParams.get("admin_invite_token");
    const token = adminToken ?? url.searchParams.get("invite_token") ?? "";
    const fragment = new URLSearchParams(url.hash.slice(1));
    const accessToken = fragment.get("access_token");
    const refreshToken = fragment.get("refresh_token");
    window.history.replaceState(null, "", "/auth/activate");
    const fail = () => window.location.replace("/login?error=invitation");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!accessToken || !refreshToken || !supabaseUrl || !publicKey || !/^[0-9a-f]{64}$/.test(token)) {
      fail(); return;
    }
    const supabase = createBrowserClient(supabaseUrl, publicKey);
    void (async () => {
      const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      if (error) { fail(); return; }
      const result = adminToken ? await completeInitialAdminInvitation(token) : await completeResidentInvitation(token);
      window.location.replace(result.success ? (adminToken ? "/app/dashboard" : "/app/my-units") : "/login?error=invitation");
    })().catch(fail);
  }, []);
  return <main className="auth-page"><p role="status">Confirmando seu convite CondoVia…</p></main>;
}
