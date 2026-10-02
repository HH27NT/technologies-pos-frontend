import { QueryClient } from "@tanstack/react-query";
import { isApiError } from "@/lib/api/types";
import { useAuthStore } from "@/lib/auth/authStore";

/**
 * QueryClient compartido. Defaults conservadores para un POS:
 *  - No reintentar errores 4xx (son de negocio/permiso, no transitorios).
 *  - Reintentar una vez el resto (red/5xx).
 *  - staleTime moderado para no golpear el backend en cada foco.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (isApiError(error) && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 1;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

/**
 * El caché pertenece a UNA sesión: al cambiar el token se vacía por completo.
 *
 * Es una barrera de aislamiento entre establecimientos (regla de oro #4), no una
 * optimización. El backend resuelve el tenant por el token, pero las query keys
 * (`qk.roles.all`, `qk.usuarios.all`…) no lo llevan: son las mismas para todos.
 * Como la app es una SPA y salir/entrar no recarga la página, sin esto el siguiente
 * usuario reutilizaba las respuestas del anterior — y con `staleTime` (5 min en
 * `useRoles`) ni siquiera refetcheaba. Síntoma: los roles a medida de un bar
 * ("Cajero nocturno") aparecían en la sesión de otro bar en la misma pestaña.
 *
 * Se cubre así el cambio de sesión completo con un solo punto: login (`setToken`),
 * cierre de sesión (`clearSession`) y expulsión por 401 del interceptor de Axios.
 * La suscripción se registra al importar el módulo, antes de que monte cualquier
 * componente, para que no exista una ventana sin la barrera.
 */
useAuthStore.subscribe((estado, anterior) => {
  if (estado.token !== anterior.token) {
    queryClient.clear();
  }
});
