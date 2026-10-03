export type PersonRelationshipKind = "ownership" | "occupancy" | "financial";

const allowedListParams = ["mode", "q", "structure", "unit", "type"] as const;

export function safePersonRelationshipReturnPath(rawPath: string, kind: string) {
  if (!(["ownership", "occupancy", "financial"] as string[]).includes(kind)) return null;
  let url: URL;
  try {
    url = new URL(rawPath, "https://condovia.invalid");
  } catch {
    return null;
  }
  if (url.origin !== "https://condovia.invalid") return null;

  const unitRoute = /^\/app\/condominium\/units\/[0-9a-f-]{36}$/i.test(url.pathname);
  if (url.pathname === "/app/condominium/owners" && kind !== "ownership") return null;
  if (url.pathname === "/app/condominium/residents" && kind !== "occupancy") return null;
  if (!unitRoute && url.pathname !== "/app/condominium/owners" && url.pathname !== "/app/condominium/residents") return null;

  const params = new URLSearchParams();
  for (const key of allowedListParams) {
    const value = url.searchParams.get(key);
    if (value) params.set(key, value.slice(0, 160));
  }
  return `${url.pathname}${params.size ? `?${params.toString()}` : ""}`;
}
