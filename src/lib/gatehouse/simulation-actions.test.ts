import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { recordSimulation, createSimulationDevice } from "./simulation-actions";
const mock = vi.hoisted(() => ({ permission: vi.fn(), rpc: vi.fn(), eq: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/condominium/access", () => ({ requireCondominiumPermission: mock.permission }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const device = "22222222-2222-4222-8222-222222222222";
const authorization = "33333333-3333-4333-8333-333333333333";
const condo = "11111111-1111-4111-8111-111111111111";
function form() {
  const data = new FormData();
  for (const [k, v] of Object.entries({ device, authorization, event: "entry", externalId: "test-001" })) data.set(k, v);
  return data;
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://kgvbmisocqmsxcibpumq.supabase.co");
  mock.from.mockImplementation((table: string) => {
    const query = {
      select: () => query,
      eq: (...args: unknown[]) => { mock.eq(...args); return query; },
      maybeSingle: async () => ({ data: table === "access_devices" ? { id: device, access_point_id: condo, status: "active" } : {
        id: authorization, visitor_id: device, service_provider_id: null, status: "approved", valid_from: "2020-01-01", valid_until: "2099-01-01",
      }, error: null }),
    };
    return query;
  });
  mock.permission.mockResolvedValue({ supabase: { from: mock.from, rpc: mock.rpc }, context: { id: condo } });
  mock.rpc.mockResolvedValue({ data: { action: "record" }, error: null });
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
it("never invokes auth or writes in production", async () => {
  vi.stubEnv("VERCEL_ENV", "production");
  expect((await recordSimulation({}, form())).error).toBeTruthy();
  expect((await createSimulationDevice({}, form())).error).toBeTruthy();
  expect(mock.permission).not.toHaveBeenCalled();
  expect(mock.rpc).not.toHaveBeenCalled();
});
it("uses the current tenant and the transactional RPC", async () => {
  expect((await recordSimulation({}, form())).success).toBeTruthy();
  expect(mock.permission).toHaveBeenCalledWith("structures.manage");
  expect(mock.eq).toHaveBeenCalledWith("condominium_id", condo);
  expect(mock.rpc).toHaveBeenCalledWith("record_access_simulation", expect.objectContaining({ p_condominium_id: condo, p_device_id: device, p_authorization_id: authorization, p_event_type: "entry", p_external_event_id: "test-001" }));
});
it("explains duplicates without claiming a new access", async () => {
  mock.rpc.mockResolvedValue({ data: { action: "duplicate" }, error: null });
  expect((await recordSimulation({}, form())).success).toContain("nenhum novo acesso");
});
it("rejects malformed input before querying or writing", async () => {
  const invalid = form(); invalid.set("device", "not-a-uuid");
  expect((await recordSimulation({}, invalid)).error).toBeTruthy();
  expect(mock.from).not.toHaveBeenCalled();
  expect(mock.rpc).not.toHaveBeenCalled();
});
it("does not continue after a failed permission check", async () => {
  mock.permission.mockRejectedValue(new Error("permission redirect"));
  await expect(recordSimulation({}, form())).rejects.toThrow("permission redirect");
  expect(mock.rpc).not.toHaveBeenCalled();
});
