/**
 * Tipos base del contrato de la API (Laravel 12 + Sanctum).
 *
 * Toda respuesta viaja en un envelope { success, message, data }. Las colecciones
 * agregan { meta, links }. El cliente Axios DESENVUELVE `data` automáticamente
 * (ver client.ts), así que las features reciben el recurso directo, nunca el
 * envelope. Estos tipos describen el envelope crudo (para el interceptor) y las
 * formas ya desenvueltas que consumen las features.
 */

/** Envelope crudo tal como llega del backend (antes de desenvolver). */
export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta;
  links?: PaginationLinks;
}

export interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface PaginationLinks {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
}

/**
 * Forma ya desenvuelta de una colección paginada. El interceptor de respuesta
 * devuelve esto (en lugar del recurso pelón) cuando el envelope trae `meta`.
 */
export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
  links: PaginationLinks;
}

/**
 * Error normalizado que rechaza el cliente. `message` viene en español desde el
 * backend y se muestra tal cual. `errors` mapea campo → mensajes de validación.
 */
export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
}

/** Type guard útil en las features para distinguir un error normalizado. */
export function isApiError(e: unknown): e is ApiError {
  return (
    typeof e === "object" &&
    e !== null &&
    "status" in e &&
    "message" in e &&
    typeof (e as ApiError).message === "string"
  );
}
