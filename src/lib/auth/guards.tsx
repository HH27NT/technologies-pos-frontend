import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "./authStore";

/**
 * Guards de ruta. Se anidan en el router:
 *   <RequireAuth>                      → exige sesión (token).
 *     <RequirePermission perm="…">     → exige un permiso concreto.
 *       <RequireCaja>                  → exige caja abierta (POS de escritura).
 *
 * Todos renderizan <Outlet/> por defecto para usarse como rutas layout.
 */

interface GuardProps {
  /** Si se pasa, se renderiza en lugar del <Outlet/> (uso como wrapper directo). */
  children?: ReactNode;
}

/** Exige token de sesión. Sin él, manda a / recordando el destino. */
export function RequireAuth({ children }: GuardProps) {
  const token = useAuthStore((s) => s.token);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return <>{children ?? <Outlet />}</>;
}

interface RequirePermissionProps extends GuardProps {
  /** Permiso requerido. Un arreglo significa "al menos uno" (OR). */
  perm: string | string[];
  /**
   * Excluye al super admin, que normalmente pasa toda compuerta. Se usa en las
   * pantallas que cuelgan de la membresía con un establecimiento (p. ej. /app/mi-pin):
   * el super admin no pertenece a ninguno y el backend le responde 403, así que
   * mostrarle la pantalla solo lo llevaría a un error.
   */
  excluirSuperAdmin?: boolean;
}

/** Exige un permiso. Sin él, muestra un aviso de acceso denegado (no redirige). */
export function RequirePermission({
  perm,
  excluirSuperAdmin,
  children,
}: RequirePermissionProps) {
  const permitido = useAuthStore((s) => {
    if (s.esSuperAdmin) return !excluirSuperAdmin;
    const requeridos = Array.isArray(perm) ? perm : [perm];
    return requeridos.some((p) => s.permisos.includes(p));
  });

  if (!permitido) {
    return <SinAcceso />;
  }

  return <>{children ?? <Outlet />}</>;
}

/**
 * Exige caja abierta para el POS de escritura (regla de oro #5). Sin caja,
 * muestra un aviso. Cancelar ítem / anular orden NO usan este guard.
 */
export function RequireCaja({ children }: GuardProps) {
  const cajaAbierta = useAuthStore((s) => s.cajaAbierta);

  if (!cajaAbierta) {
    return <CajaCerrada />;
  }

  return <>{children ?? <Outlet />}</>;
}

// --- Avisos ------------------------------------------------------------------

function SinAcceso() {
  return (
    <div className="grid min-h-[60vh] place-items-center p-6">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl text-foreground">Sin acceso</h1>
        <p className="mt-2 text-text-secondary">
          No tienes permiso para ver esta sección. Si crees que es un error,
          contacta al administrador.
        </p>
      </div>
    </div>
  );
}

function CajaCerrada() {
  return (
    <div className="grid min-h-[60vh] place-items-center p-6">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl text-foreground">Caja cerrada</h1>
        <p className="mt-2 text-text-secondary">
          Abre una sesión de caja para operar el punto de venta.
        </p>
      </div>
    </div>
  );
}
