import { Outlet } from "react-router-dom";
import { useBootstrapSession } from "@/lib/auth";

/**
 * Raíz del árbol de rutas. Hidrata la sesión (GET /auth/me) antes de resolver los
 * guards, para no parpadear entre "sin permiso" y el contenido real.
 */
export function RootBoot() {
  const sesionCargada = useBootstrapSession();

  if (!sesionCargada) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-text-muted">
        <span className="animate-pulse">Cargando…</span>
      </div>
    );
  }

  return <Outlet />;
}
