export function formatProviderLabel(name: string, company?: string | null) {
  return company ? `${name} · ${company}` : name;
}

export function ProviderDisplay({ name, company, inline = false }: { name: string; company?: string | null; inline?: boolean }) {
  if (inline) return <>{formatProviderLabel(name, company)}</>;
  return <><strong>{name}</strong>{company && <small className="cv-muted" style={{ display: "block" }}>{company}</small>}</>;
}
