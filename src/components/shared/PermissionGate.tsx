import type { ReactNode } from "react";
import { useAuthStore } from "@/lib/auth";

interface PermissionGateProps {
  /** Permiso requerido. Un arreglo significa "al menos uno" (OR). */
  permiso: string | string[];
  children: ReactNode;
  /** Qué renderizar si no hay permiso (por defecto: nada). */
  fallback?: ReactNode;
}

/**
 * Muestra su contenido solo si el usuario tiene el permiso (regla de oro #3).
 * El super_admin siempre pasa. Envuelve acciones sensibles; nunca gatees por rol.
 */
export function PermissionGate({
  permiso,
  children,
  fallback = null,
}: PermissionGateProps) {
  const permitido = useAuthStore((s) => {
    if (s.esSuperAdmin) return true;
    const requeridos = Array.isArray(permiso) ? permiso : [permiso];
    return requeridos.some((p) => s.permisos.includes(p));
  });

  return <>{permitido ? children : fallback}</>;
}
