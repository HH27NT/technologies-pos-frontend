import { useEffect } from "react";
import { client } from "@/lib/api/client";
import { useAuthStore, type Usuario } from "./authStore";

/** Forma desenvuelta de GET /auth/me. */
interface MeResponse {
  usuario: Usuario;
  permisos: string[];
  es_super_admin: boolean;
}

/**
 * Forma desenvuelta de GET /caja/actual. El backend devuelve el objeto de la
 * sesión de caja abierta, o `null` si no hay ninguna. Por eso la compuerta se
 * decide por presencia (`data !== null`), no por un campo booleano.
 */
type CajaActualResponse = { id: number; [k: string]: unknown } | null;

/**
 * Hidrata la sesión desde el backend: usuario, permisos y estado de caja.
 * Se llama al arrancar la app si hay token persistido. Ante 401 el cliente ya
 * limpia la sesión; aquí solo marcamos `sesionCargada` para destrabar los guards.
 */
export async function bootstrapSession(): Promise<void> {
  const store = useAuthStore.getState();

  if (!store.token) {
    store.setSesionCargada(true);
    return;
  }

  try {
    const me = await client.get<MeResponse>("/auth/me");
    store.setSesion({
      usuario: me.usuario,
      permisos: me.permisos ?? [],
      esSuperAdmin: me.es_super_admin ?? false,
    });

    // Estado de caja para la compuerta del POS. No es fatal si falla.
    try {
      const caja = await client.get<CajaActualResponse>("/caja/actual");
      // Hay caja abierta si el backend devolvió una sesión (no `null`).
      store.setCajaAbierta(caja !== null && caja !== undefined);
    } catch {
      store.setCajaAbierta(false);
    }
  } catch {
    // 401 → el interceptor ya llamó clearSession(). Otros errores: dejar sin sesión.
    useAuthStore.getState().setSesionCargada(true);
  }
}

/** Hook para disparar la hidratación una sola vez al montar la app. */
export function useBootstrapSession(): boolean {
  const sesionCargada = useAuthStore((s) => s.sesionCargada);

  useEffect(() => {
    if (!useAuthStore.getState().sesionCargada) {
      void bootstrapSession();
    }
  }, []);

  return sesionCargada;
}
