/**
 * Catálogo de tipos de orden (M11). El backend NO expone un endpoint de catálogo;
 * `id_tipo_orden` es un enum fijo. Los tres ids quedaron CONFIRMADOS contra el
 * backend real (Fase 7): el `contenido_json` del ticket de cobro devuelve
 * `orden.tipo` — 1 = "mesa" (exige `id_mesa`), 2 = "barra", 3 = "llevar". Las
 * etiquetas de abajo son el texto de presentación; los tokens del backend son
 * mesa/barra/llevar.
 */
export interface TipoOrden {
  id: number;
  label: string;
  /** Si exige elegir mesa al crear (solo el tipo mesa). */
  requiereMesa: boolean;
}

export const TIPOS_ORDEN: TipoOrden[] = [
  { id: 1, label: "Mesa", requiereMesa: true },
  { id: 2, label: "Barra", requiereMesa: false },
  { id: 3, label: "Para llevar", requiereMesa: false },
];

export function tipoOrdenLabel(id: number): string {
  return TIPOS_ORDEN.find((t) => t.id === id)?.label ?? `Tipo ${id}`;
}
