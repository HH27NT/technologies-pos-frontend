import { toNumber } from "./money";

/**
 * Cantidades de receta y de inventario (NO dinero: para eso está `formatMoney`).
 *
 * El backend guarda `decimal(10,3)` y lo manda como string, así que un "1" capturado
 * vuelve como `"1.000"`. Esos ceros de relleno se leen como una precisión que nadie
 * midió —y en una barra, donde casi todas las recetas son de una pieza, ensucian la
 * lista entera—. Aquí se muestran solo los decimales que el número realmente tiene:
 * `1.000` → "1", `0.500` → "0.5", `1.250` → "1.25".
 */
const CANTIDAD = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

export function formatCantidad(value: string | number | null | undefined): string {
  return CANTIDAD.format(toNumber(value));
}

/**
 * La cantidad con su unidad: "1 bot", "0.5 kg". Sin unidad devuelve solo el número,
 * que es lo que pasa con los insumos que aún no la tienen cargada.
 */
export function formatCantidadConUnidad(
  value: string | number | null | undefined,
  abreviacion?: string | null,
): string {
  const cantidad = formatCantidad(value);
  return abreviacion ? cantidad + " " + abreviacion : cantidad;
}
