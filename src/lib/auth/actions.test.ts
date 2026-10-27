import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requestPasswordReset, updatePassword } from "./actions";

const mocks = vi.hoisted(() => ({ reset: vi.fn(), update: vi.fn(), redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { resetPasswordForEmail: mocks.reset, updateUser: mocks.update } }) }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: "homolog-condovia.kynovia.com.br" }), cookies: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/condominium/access", () => ({ hasPermission: vi.fn() }));
vi.mock("@/lib/auth/context", () => ({ getPostLoginDestination: vi.fn() }));

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://homolog-condovia.kynovia.com.br");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe("password recovery", () => {
  it("does not report success when the recovery service rejects the request", async () => {
    mocks.reset.mockResolvedValue({ error: { code: "over_email_send_rate_limit", message: "rate limit" } });
    const result = await requestPasswordReset({}, form({ email: "test@example.com" }));
    expect(result.error).toBeTruthy();
    expect(result.success).toBeUndefined();
  });
  it("keeps the generic success message and recovery callback after an accepted request", async () => {
    mocks.reset.mockResolvedValue({ error: null });
    const result = await requestPasswordReset({}, form({ email: "test@example.com" }));
    expect(result.success).toContain("Se houver uma conta");
    expect(mocks.reset).toHaveBeenCalledWith("test@example.com", { redirectTo: "https://homolog-condovia.kynovia.com.br/auth/callback?next=%2Freset-password" });
  });
  it("asks for a different password when the current password is reused", async () => {
    mocks.update.mockResolvedValue({ error: { code: "same_password", message: "New password should be different from the old password." } });
    const result = await updatePassword({}, form({ password: "test-password", confirmation: "test-password" }));
    expect(result.error).toBe("A nova senha deve ser diferente da senha atual. Escolha outra senha.");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
  it("does not redirect when updating the password fails", async () => {
    mocks.update.mockResolvedValue({ error: { code: "session_not_found", message: "expired" } });
    const result = await updatePassword({}, form({ password: "test-password", confirmation: "test-password" }));
    expect(result.error).toContain("Solicite um novo link");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
