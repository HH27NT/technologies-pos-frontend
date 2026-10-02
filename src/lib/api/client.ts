import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { useAuthStore } from "@/lib/auth/authStore";
import type { ApiEnvelope, ApiError, Paginated } from "./types";

/**
 * Cliente Axios del Bar POS. Reglas de oro que implementa:
 *  1. baseURL = `${VITE_API_URL}/api/v1`.
 *  2. Inyecta `Authorization: Bearer <token>` desde el authStore.
 *  3. Desenvuelve `data` del envelope; si hay `meta`, devuelve { data, meta, links }.
 *  4. Normaliza errores a ApiError { status, message, errors } (message en español).
 *  5. En 401 limpia la sesión y manda a /. Sanctum en modo token (sin cookies/CSRF).
 */

const instance = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api/v1`,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// --- Request: token Bearer ---------------------------------------------------
instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Response (éxito): desenvolver el envelope -------------------------------
instance.interceptors.response.use(
  (response) => {
    const body = response.data as ApiEnvelope<unknown> | unknown;
    let result: unknown;

    if (!body || typeof body !== "object" || !("data" in body)) {
      // Respuestas sin cuerpo (204) o que no siguen el envelope: pasar tal cual.
      result = body;
    } else {
      const envelope = body as ApiEnvelope<unknown>;
      if (envelope.meta) {
        // Colección paginada: exponer { data, meta, links } para la DataTable.
        const paginated: Paginated<unknown> = {
          data: envelope.data as unknown[],
          meta: envelope.meta,
          links: envelope.links ?? {
            first: null,
            last: null,
            prev: null,
            next: null,
          },
        };
        result = paginated;
      } else {
        // Recurso simple: devolver el `data` pelón.
        result = envelope.data;
      }
    }

    // El interceptor reemplaza la respuesta por el valor desenvuelto; la fachada
    // `client` re-tipa el retorno a T, así que este cast puentea a Axios.
    return result as unknown as AxiosResponse;
  },
  // --- Response (error): normalizar a ApiError ------------------------------
  (error: AxiosError<{ message?: string; errors?: Record<string, string[]> }>) => {
    const status = error.response?.status ?? 0;
    const payload = error.response?.data;

    const apiError: ApiError = {
      status,
      message:
        payload?.message ??
        (status === 0
          ? "No se pudo conectar con el servidor."
          : "Ocurrió un error inesperado."),
      errors: payload?.errors,
    };

    if (status === 401) {
      // Token vencido/inválido: cerrar sesión local y volver al login.
      useAuthStore.getState().clearSession();
      if (
        typeof window !== "undefined" &&
        window.location.pathname !== "/"
      ) {
        window.location.assign("/");
      }
    }

    return Promise.reject(apiError);
  },
);

/**
 * Fachada tipada. Como el interceptor ya devuelve el valor desenvuelto, cada
 * método resuelve directamente a `T` (no a AxiosResponse<T>). Para listas
 * paginadas usa `T = Paginated<Recurso>`.
 */
export const client = {
  get: <T = unknown>(url: string, config?: AxiosRequestConfig) =>
    instance.get<T, T>(url, config),
  post: <T = unknown>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    instance.post<T, T>(url, body, config),
  put: <T = unknown>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    instance.put<T, T>(url, body, config),
  patch: <T = unknown>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    instance.patch<T, T>(url, body, config),
  delete: <T = unknown>(url: string, config?: AxiosRequestConfig) =>
    instance.delete<T, T>(url, config),
};

/** Instancia cruda por si algún caso necesita la respuesta completa de Axios. */
export { instance as axiosInstance };
