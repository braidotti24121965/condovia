import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), permission: vi.fn(), revalidate: vi.fn(), redirect: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/condominium/access", () => ({ requireCondominiumPermission: mocks.permission }));
import { saveContract } from "./management-actions";

function contract(end = "2026-10-09") {
  const form = new FormData();
  for (const [key, value] of Object.entries({ title: "Contrato de teste", service_provider_id: "provider-id", starts_on: "2026-10-10", ends_on: end, amount: "0", status: "draft", notes: "Preservar observação" })) form.set(key, value);
  return form;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.permission.mockResolvedValue({ context: { id: "condominium-id" }, supabase: { rpc: mocks.rpc } });
  mocks.redirect.mockImplementation(() => { throw new Error("redirect"); });
});

describe("salvamento do contrato", () => {
  it("preserva os campos e não grava período invertido", async () => {
    const state = await saveContract({ attempt: 0 }, contract());
    expect(state.error).toBe("A data de término deve ser igual ou posterior à data de início.");
    expect(state.values).toMatchObject({ title: "Contrato de teste", starts_on: "2026-10-10", ends_on: "2026-10-09", status: "draft", notes: "Preservar observação" });
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
  it("preserva os campos também quando o banco rejeita o contrato", async () => {
    mocks.rpc.mockResolvedValue({ error: { message: "Prestador inválido" } });
    const state = await saveContract({ attempt: 1 }, contract("2026-10-10"));
    expect(state.error).toBe("Prestador inválido");
    expect(state.values?.notes).toBe("Preservar observação");
    expect(state.attempt).toBe(2);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
  it("salva e redireciona quando o período válido é aceito", async () => {
    mocks.rpc.mockResolvedValue({ error: null });
    await expect(saveContract({ attempt: 0 }, contract("2026-10-10"))).rejects.toThrow("redirect");
    expect(mocks.rpc).toHaveBeenCalledWith("save_maintenance_contract", expect.objectContaining({ p_start: "2026-10-10", p_end: "2026-10-10", p_amount: 0 }));
    expect(mocks.redirect).toHaveBeenCalledWith("/app/condominium/maintenance/contracts?updated=1");
  });
});
