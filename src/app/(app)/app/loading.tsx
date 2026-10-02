export default function AppLoading() {
  return <div className="dashboard-page loading-page" role="status" aria-label="Carregando painel">
    <span className="skeleton skeleton-crumb" />
    <span className="skeleton skeleton-heading" />
    <span className="skeleton skeleton-subheading" />
    <div className="skeleton skeleton-banner" />
    <span className="skeleton skeleton-section-title" />
    <div className="skeleton-grid"><span className="skeleton" /><span className="skeleton" /><span className="skeleton" /></div>
    <span className="sr-only">Carregando seu espaço CondoVia…</span>
  </div>;
}
