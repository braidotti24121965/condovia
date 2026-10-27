/** Both the page and the action fail closed outside the homologation backend. */
export function isAccessSimulationEnabled() {
  return process.env.VERCEL_ENV !== "production" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL === "https://kgvbmisocqmsxcibpumq.supabase.co";
}
