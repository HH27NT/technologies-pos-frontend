/**
 * Presentación de folios de orden/ticket. Si el backend ya manda un folio con
 * formato (string), muéstralo tal cual; este helper es para derivar uno legible
 * a partir de un id numérico.
 */

/** 123 → "#000123". */
export function formatFolio(id: number | string, ancho = 6): string {
  const n = typeof id === "number" ? id : Number(id);
  if (!Number.isFinite(n)) return `#${id}`;
  return `#${String(Math.trunc(n)).padStart(ancho, "0")}`;
}
