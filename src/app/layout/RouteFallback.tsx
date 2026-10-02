/**
 * Fallback de carga para rutas con code-splitting (React.lazy). Ligero y neutro:
 * se muestra mientras el chunk de la pantalla se descarga. El chrome (Topbar/
 * Sidebar) permanece porque el <Suspense> vive dentro del layout.
 */
export function RouteFallback() {
  return (
    <div className="grid min-h-[50vh] place-items-center" role="status" aria-live="polite">
      <span className="text-text-secondary">Cargando…</span>
    </div>
  );
}
