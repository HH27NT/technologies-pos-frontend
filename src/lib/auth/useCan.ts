import { useAuthStore } from "./authStore";

/**
 * RBAC guiado por permisos (regla de oro #3). Devuelve true si el usuario tiene
 * el permiso indicado. El super_admin pasa todas las compuertas.
 *
 * Nunca hardcodees visibilidad por rol; usa siempre el nombre del permiso
 * (ej. "ordenes.cobrar", "productos.gestionar").
 */
export function useCan(permiso: string): boolean {
  return useAuthStore(
    (s) => s.esSuperAdmin || s.permisos.includes(permiso),
  );
}

/** Variante para checar varios permisos a la vez (todos requeridos). */
export function useCanAll(...permisos: string[]): boolean {
  return useAuthStore(
    (s) => s.esSuperAdmin || permisos.every((p) => s.permisos.includes(p)),
  );
}

/** Variante para checar varios permisos a la vez (al menos uno). */
export function useCanAny(...permisos: string[]): boolean {
  return useAuthStore(
    (s) => s.esSuperAdmin || permisos.some((p) => s.permisos.includes(p)),
  );
}
