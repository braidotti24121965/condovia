export function PageLoading({ label = "Carregando" }: { label?: string }) {
  return <div className="cv-page loading-page" role="status" aria-label={`${label}…`}>
    <span className="skeleton skeleton-crumb" />
    <span className="skeleton skeleton-heading" />
    <span className="skeleton skeleton-subheading" />
    <div className="skeleton-grid"><span className="skeleton" /><span className="skeleton" /><span className="skeleton" /></div>
    <div className="skeleton skeleton-table" />
    <span className="sr-only">{label}…</span>
  </div>;
}
