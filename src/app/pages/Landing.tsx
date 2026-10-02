import { Link } from "react-router-dom";
import { formatMoney } from "@/lib/format";

/**
 * Página pública de fundación. No es una feature: sirve para verificar que los
 * tokens, Tailwind y ambos temas (claro admin / oscuro POS) renderizan bien.
 */
export function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <header>
          <span className="inline-flex items-center rounded-full bg-success-bg px-3 py-1 text-xs text-success">
            Fase 0 · fundación lista
          </span>
          <h1 className="mt-4 font-display text-3xl">Bar POS</h1>
          <p className="mt-2 max-w-xl text-text-secondary">
            Cliente Axios con envelope, autenticación por token, RBAC por permisos
            y guards de ruta ya montados. Aún sin features.
          </p>
        </header>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {/* Tarjeta de administración (tema claro) */}
          <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h2 className="font-display text-lg">Administración</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Tema claro por defecto. Superficies crema, tipografía Inter.
            </p>
            <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
              <span className="text-text-muted">Total del día</span>
              <span className="font-display text-2xl tabular-nums">
                {formatMoney("18450.50")}
              </span>
            </div>
          </section>

          {/* Tarjeta del POS (tema oscuro) */}
          <section
            data-mode="dark"
            className="rounded-xl border border-border bg-surface-1 p-5 text-text-primary shadow-md"
          >
            <h2 className="font-display text-lg">Punto de venta</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Tema oscuro (data-mode="dark"). Carbón cálido, acento ámbar.
            </p>
            <button
              type="button"
              className="mt-4 min-h-tap w-full rounded-lg bg-primary px-4 font-display font-semibold text-primary-foreground transition hover:bg-brand-hover"
            >
              Cobrar {formatMoney("284")}
            </button>
          </section>
        </div>

        <nav className="mt-10 flex gap-4 text-sm">
          <Link to="/" className="text-brand-accent underline-offset-4 hover:underline">
            Ir a iniciar sesión
          </Link>
          <Link to="/app" className="text-brand-accent underline-offset-4 hover:underline">
            Zona protegida (prueba el guard)
          </Link>
        </nav>
      </div>
    </div>
  );
}
