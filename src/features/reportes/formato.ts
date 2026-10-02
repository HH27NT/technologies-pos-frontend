import { formatMoney, formatDecimal } from "@/lib/format";
import type { ReporteDef } from "./constants";

/**
 * Formateo de valores de reporte para mostrar (regla #6: solo se muestran). El
 * tipo se decide por la clave (money/pct del `ReporteDef`), no por heurística de
 * nombre, porque una misma clave puede ser dinero en un reporte y conteo en otro.
 */

/** ¿La celda es numérica (dinero, porcentaje o número)? Para alinear a la derecha. */
export function esNumerica(
  key: string,
  value: string | number | null,
  def: Pick<ReporteDef, "money" | "pct">,
): boolean {
  return def.money.includes(key) || def.pct.includes(key) || typeof value === "number";
}

/** Formatea un valor de fila/resumen según su clave. */
export function formatCelda(
  key: string,
  value: string | number | null,
  def: Pick<ReporteDef, "money" | "pct">,
): string {
  if (value === null || value === undefined || value === "") return "—";
  if (def.pct.includes(key)) return `${formatDecimal(value, 2)} %`;
  if (def.money.includes(key)) return formatMoney(value);
  if (typeof value === "number") {
    return formatDecimal(value, Number.isInteger(value) ? 0 : 2);
  }
  return String(value);
}

/** Etiqueta legible de una clave de resumen: "ventas_total" → "Ventas total". */
export function humanizarClave(key: string): string {
  const s = key.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
