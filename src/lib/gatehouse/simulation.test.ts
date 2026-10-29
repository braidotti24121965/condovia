import { afterEach, expect, it, vi } from "vitest";
import { isAccessSimulationEnabled } from "./simulation";
afterEach(() => vi.unstubAllEnvs());
it("fails closed for production even with homologation configuration", () => {
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://kgvbmisocqmsxcibpumq.supabase.co");
  expect(isAccessSimulationEnabled()).toBe(false);
});
it("requires the exact homologation backend", () => {
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://another.supabase.co");
  expect(isAccessSimulationEnabled()).toBe(false);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://kgvbmisocqmsxcibpumq.supabase.co");
  expect(isAccessSimulationEnabled()).toBe(true);
});
