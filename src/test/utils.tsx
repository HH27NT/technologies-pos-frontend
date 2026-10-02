import type { ReactElement, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import { useAuthStore } from "@/lib/auth";

/**
 * Utilidades de test. Montan el árbol mínimo que necesitan las features:
 * TanStack Query (hooks de datos) y el authStore hidratado (RBAC de `useCan`).
 */

/** QueryClient de test: sin reintentos, para que un 4xx falle de inmediato. */
function nuevoQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

interface OpcionesRender extends Omit<RenderOptions, "wrapper"> {
  /** Permisos de la sesión simulada (regla de oro #3). */
  permisos?: string[];
  esSuperAdmin?: boolean;
}

export function renderConProviders(
  ui: ReactElement,
  { permisos = [], esSuperAdmin = false, ...options }: OpcionesRender = {},
) {
  useAuthStore.setState({
    token: "test-token",
    usuario: { id: 1, nombre: "Operador de prueba" },
    permisos,
    esSuperAdmin,
    sesionCargada: true,
  });

  const queryClient = nuevoQueryClient();

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

/** Limpia la sesión entre tests (el store es un singleton del módulo). */
export function limpiarSesion() {
  useAuthStore.setState({
    token: null,
    usuario: null,
    permisos: [],
    esSuperAdmin: false,
    sesionCargada: false,
  });
}

/** Construye el ApiError normalizado que rechaza el cliente Axios (ver lib/api/client). */
export function apiError(status: number, message: string, errors?: Record<string, string[]>) {
  return { status, message, errors };
}
