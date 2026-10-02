import { format, formatDistanceToNow, parseISO } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Formateo de fechas en español. El backend envía ISO 8601 (string). Aquí solo
 * se muestran; para lógica de negocio confía en el backend.
 */

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : parseISO(value);
}

/** "2026-07-02T14:30:00Z" → "2 jul 2026". */
export function formatFecha(value: string | Date): string {
  return format(toDate(value), "d MMM yyyy", { locale: es });
}

/** "2026-07-02T14:30:00Z" → "2 jul 2026, 14:30". */
export function formatFechaHora(value: string | Date): string {
  return format(toDate(value), "d MMM yyyy, HH:mm", { locale: es });
}

/** Solo la hora: "14:30". */
export function formatHora(value: string | Date): string {
  return format(toDate(value), "HH:mm", { locale: es });
}

/** "hace 5 minutos". Útil para auditoría y autorizaciones. */
export function formatRelativo(value: string | Date): string {
  return formatDistanceToNow(toDate(value), { locale: es, addSuffix: true });
}
