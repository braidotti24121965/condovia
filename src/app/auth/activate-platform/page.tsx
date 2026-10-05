"use client";

import { useEffect, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function ActivatePlatformPage() {
  const started=useRef(false);
  useEffect(()=>{
    if(started.current)return; started.current=true;
    const url=new URL(window.location.href);
    const fragment=new URLSearchParams(url.hash.slice(1));
    const accessToken=fragment.get("access_token"); const refreshToken=fragment.get("refresh_token");
    window.history.replaceState(null,"","/auth/activate-platform");
    const fail=()=>window.location.replace("/login?error=invitation");
    const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL; const publicKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if(!accessToken||!refreshToken||!supabaseUrl||!publicKey){fail();return;}
    const supabase=createBrowserClient(supabaseUrl,publicKey);
    void supabase.auth.setSession({access_token:accessToken,refresh_token:refreshToken}).then(({error})=>{
      window.location.replace(error?"/login?error=invitation":"/reset-password");
    }).catch(fail);
  },[]);
  return <main className="auth-page"><p role="status">Ativando a administração CondoVia…</p></main>;
}
