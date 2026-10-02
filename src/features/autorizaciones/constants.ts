/**
 * Catálogo de tipos de autorización (M14). Enum CONFIRMADO contra el backend real.
 * El `tipo` lo determina el backend según la operación (cancelar_item, anular_orden,
 * entrada_stock, ajuste_stock); aquí solo se etiqueta para la bandeja/auditoría.
 */
export const TIPO_AUTORIZACION_LABEL: Record<string, string> = {
  cancelar_item: "Cancelar ítem",
  anular_orden: "Anular orden",
  entrada_stock: "Entrada de inventario",
  ajuste_stock: "Ajuste de inventario",
};

export function tipoAutorizacionLabel(tipo: string): string {
  return TIPO_AUTORIZACION_LABEL[tipo] ?? tipo;
}
