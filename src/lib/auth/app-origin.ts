type HeaderReader = { get(name: string): string | null };

function normalizeOrigin(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Resolve a URL pública do ambiente atual (produção, homologação ou local).
 * Prioridade: NEXT_PUBLIC_APP_URL configurada no ambiente; depois o host da própria requisição.
 */
export function resolveAppOrigin(configured: string | null | undefined, requestHeaders: HeaderReader): string | null {
  const fromConfig = normalizeOrigin(configured);
  if (fromConfig) return fromConfig;

  const host = (requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"))?.split(",")[0]?.trim();
  if (!host) return null;
  const forwardedProto = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  const proto = forwardedProto === "http" || forwardedProto === "https" ? forwardedProto : isLocal ? "http" : "https";
  return normalizeOrigin(`${proto}://${host}`);
}
