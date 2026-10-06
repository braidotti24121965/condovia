import { describe, expect, it, vi } from "vitest";
import { handleReservationRealtimeEvent, logReservationRealtimeStatus, resolveNavigation, setupReservationRealtimeDiagnostics } from "./app-shell";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthorizedContext } from "@/lib/auth/context";

const condominium = (role: string): AuthorizedContext => ({ type: "condominium", id: "condo-1", name: "Condomínio", role });

describe("Painel landing route", () => {
  it("shows residents only the operational menu", () => expect(resolveNavigation(condominium("Morador"), false, true)).toEqual({ resident: true, primary: [{ label: "Meu perfil", href: "/app/profile" }, { label: "Minhas Unidades", href: "/app/my-units" }, { label: "Reservas", href: "/app/reservations" }], showCondominiumSection: false }));
  it("keeps the administrative dashboard and condominium section", () => expect(resolveNavigation(condominium("Síndico"), true, true)).toMatchObject({ resident: false, primary: [{ label: "Painel", href: "/app/dashboard" }, { label: "Meu perfil", href: "/app/profile" }], showCondominiumSection: true }));
  it("keeps platform and administrator routes unchanged", () => {
    expect(resolveNavigation({ type: "platform", id: "platform", name: "CondoVia", role: "Admin" }).primary[0].href).toBe("/app/platform");
    expect(resolveNavigation({ type: "administrator", id: "admin-1", name: "Admin", role: "Admin" }).primary[0].href).toBe("/app/dashboard");
  });
});

describe("Reservations realtime instrumentation", () => {
  it("logs every observable channel status without sensitive data", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    for (const status of ["SUBSCRIBED", "CHANNEL_ERROR", "TIMED_OUT", "CLOSED"]) logReservationRealtimeStatus(status);
    expect(info).toHaveBeenCalledWith("[reservations-realtime] status SUBSCRIBED");
    expect(info).toHaveBeenCalledWith("[reservations-realtime] status CLOSED");
    expect(error).toHaveBeenCalledWith("[reservations-realtime] status CHANNEL_ERROR");
    expect(warn).toHaveBeenCalledWith("[reservations-realtime] status TIMED_OUT");
    expect(JSON.stringify([...info.mock.calls, ...error.mock.calls, ...warn.mock.calls])).not.toContain("secret");
    expect(JSON.stringify([...info.mock.calls, ...error.mock.calls, ...warn.mock.calls])).not.toContain("resident");
    info.mockRestore(); error.mockRestore(); warn.mockRestore();
  });

  it("logs INSERT/UPDATE observability and still refreshes", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const refresh = vi.fn();
    handleReservationRealtimeEvent("INSERT", { new: { condominium_id: "condo-1" } }, "condo-1", refresh);
    handleReservationRealtimeEvent("UPDATE", { new: { condominium_id: "other" } }, "condo-1", refresh);
    expect(info).toHaveBeenNthCalledWith(1, "[reservations-realtime] event INSERT", "condominium match=true", "refresh=true");
    expect(info).toHaveBeenNthCalledWith(2, "[reservations-realtime] event UPDATE", "condominium match=false", "refresh=true");
    expect(refresh).toHaveBeenCalledTimes(2);
    info.mockRestore();
  });

  it("creates filtered and unfiltered diagnostic INSERT channels and cleans both up", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const subscriptions: Array<{ event: string; config: Record<string, string>; callback: () => void; statusCallback: (status: string) => void }> = [];
    const removed: string[] = [];
    const client = {
      channel(name: string) {
        return {
          on(_event: string, config: Record<string, string>, callback: () => void) {
            const subscription: { event: string; config: Record<string, string>; callback: () => void; statusCallback: (status: string) => void } = { event: _event, config, callback, statusCallback: (status: string) => { void status; } };
            subscriptions.push(subscription);
            return { subscribe(statusCallback: (status: string) => void) { subscription.statusCallback = statusCallback; return { name }; } };
          },
        };
      },
      removeChannel(channel: { name?: string }) { removed.push(channel.name || "removed"); return Promise.resolve("ok"); },
    } as unknown as SupabaseClient;
    const cleanup = setupReservationRealtimeDiagnostics(client, "condo-1");
    expect(subscriptions).toHaveLength(2);
    expect(subscriptions[0].event).toBe("postgres_changes");
    expect(subscriptions[0].config.filter).toBe("condominium_id=eq.condo-1");
    expect(subscriptions[1].config.filter).toBeUndefined();
    subscriptions.forEach((subscription) => subscription.statusCallback("SUBSCRIBED"));
    subscriptions.forEach((subscription) => subscription.callback());
    expect(info).toHaveBeenCalledWith("[reservations-diag-filtered] status SUBSCRIBED");
    expect(info).toHaveBeenCalledWith("[reservations-diag-unfiltered] status SUBSCRIBED");
    expect(info).toHaveBeenCalledWith("[reservations-diag-filtered] INSERT received=true");
    expect(info).toHaveBeenCalledWith("[reservations-diag-unfiltered] INSERT received=true");
    expect(JSON.stringify([...info.mock.calls, ...error.mock.calls, ...warn.mock.calls])).not.toContain("payload");
    cleanup();
    expect(removed).toHaveLength(2);
    info.mockRestore(); error.mockRestore(); warn.mockRestore();
  });
});
