/**
 * Formateo de dinero. El backend manda los decimales como string y los importes
 * (subtotal, descuento, impuesto, total) llegan CONGELADOS (regla de oro #6):
 * aquí solo se muestran, nunca se recalculan.
 *
 * En la UI, las cifras deben ir con la clase `tabular-nums` para alinear columnas.
 */

const MXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Convierte el valor del backend (string | number) a número de forma segura. */
export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** "1234.5" → "$1,234.50". Pensado solo para mostrar, no para operar. */
export function formatMoney(value: string | number | null | undefined): string {
  return MXN.format(toNumber(value));
}

/** Número sin símbolo de moneda: "1234.5" → "1,234.50". */
export function formatDecimal(
  value: string | number | null | undefined,
  fractionDigits = 2,
): string {
  return new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(toNumber(value));
}
