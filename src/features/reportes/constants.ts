/**
 * Catálogo de reportes (M16) y presets de rango. Valores CONFIRMADOS contra el
 * backend real:
 *  - Presets válidos: hoy | semana | mes | año (otro → 422 "El periodo debe ser…").
 *  - Reportes admin-only (`reportes.ver`): inventario, cancelaciones, margen,
 *    consumo-insumos, top-recetas y ventas-por-mesero (el operador con
 *    `reportes.ver_limitado` recibe 403). `soloAdmin` debe espejar
 *    `TipoReporte::soloAdmin()` del backend, que es la fuente de verdad.
 *  - Formatos de exportación: pdf | excel.
 *
 * `money`/`pct` listan las claves de fila/resumen que se formatean como dinero o
 * porcentaje (no se puede inferir por nombre: p. ej. `total` es dinero en ventas
 * pero conteo en cancelaciones).
 */

export interface PresetRango {
  value: string;
  label: string;
}

export const PRESETS: PresetRango[] = [
  { value: "hoy", label: "Hoy" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mes" },
  { value: "año", label: "Año" },
];

export interface FormatoExport {
  value: string;
  label: string;
}

export const FORMATOS_EXPORT: FormatoExport[] = [
  { value: "pdf", label: "PDF" },
  { value: "excel", label: "Excel" },
];

/** Config de gráfica de una serie (magnitud por categoría). */
export interface ChartDef {
  /** Clave categórica (eje X). */
  x: string;
  /** Clave numérica (eje Y). */
  y: string;
}

export interface ReporteDef {
  /** Slug del endpoint: `/reportes/{tipo}`. */
  tipo: string;
  label: string;
  descripcion: string;
  /** Requiere `reportes.ver` (admin); si false basta `reportes.ver_limitado`. */
  soloAdmin: boolean;
  /** Claves formateadas como dinero (filas y resumen). */
  money: string[];
  /** Claves formateadas como porcentaje. */
  pct: string[];
  /** Si se define y hay filas, se dibuja una gráfica de barras de una serie. */
  chart?: ChartDef;
}

export const REPORTES: ReporteDef[] = [
  {
    tipo: "dashboard",
    label: "Dashboard",
    descripcion: "Resumen del día: ventas, órdenes y productos más vendidos.",
    soloAdmin: false,
    money: ["total", "ventas_total"],
    pct: [],
    chart: { x: "producto", y: "total" },
  },
  {
    tipo: "ventas",
    label: "Ventas",
    descripcion: "Ventas por día con subtotal, descuento, impuesto y total.",
    soloAdmin: false,
    money: ["subtotal", "descuento", "impuesto", "total"],
    pct: [],
    chart: { x: "fecha", y: "total" },
  },
  {
    tipo: "ventas-mensuales",
    label: "Ventas por mes",
    descripcion:
      "Órdenes y total cobrado, agrupados por mes. Respeta el rango: con “hoy” o “semana” verás un solo mes, así que úsalo con “año”.",
    soloAdmin: false,
    money: ["total"],
    pct: [],
    chart: { x: "mes", y: "total" },
  },
  {
    tipo: "caja",
    label: "Caja",
    descripcion: "Sesiones de caja: inicial, sistema, contado y diferencia.",
    soloAdmin: false,
    money: ["inicial", "sistema", "contado", "diferencia", "diferencia_total"],
    pct: [],
  },
  {
    tipo: "medios-pago",
    label: "Medios de pago",
    descripcion: "Operaciones y monto por medio de pago.",
    soloAdmin: false,
    money: ["monto"],
    pct: [],
    chart: { x: "medio", y: "monto" },
  },
  {
    tipo: "ventas-por-mesero",
    label: "Ventas por mesero",
    descripcion:
      "Cuánto atendió y cuánto cobró cada quien. Atender y cobrar son columnas distintas: quien cierra la mesa de un compañero no se queda con su venta.",
    soloAdmin: true,
    money: ["monto_atendido", "monto_cobrado", "monto"],
    pct: [],
    chart: { x: "mesero", y: "monto_atendido" },
  },
  {
    tipo: "inventario",
    label: "Inventario",
    descripcion: "Movimientos de existencias en el periodo (solo admin).",
    soloAdmin: true,
    money: [],
    pct: [],
  },
  {
    tipo: "consumo-insumos",
    label: "Insumos usados",
    descripcion:
      "Cuánto se consumió de cada insumo en el periodo, con su unidad de medida (solo admin).",
    soloAdmin: true,
    money: [],
    pct: [],
    chart: { x: "insumo", y: "cantidad" },
  },
  {
    tipo: "top-recetas",
    label: "Insumos en recetas",
    descripcion:
      "En cuántos productos participa cada insumo. Mide dependencia, no consumo: si falta uno de arriba, se caen varios productos a la vez (solo admin).",
    soloAdmin: true,
    money: [],
    pct: [],
    chart: { x: "insumo", y: "recetas" },
  },
  {
    tipo: "cancelaciones",
    label: "Cancelaciones",
    descripcion: "Ítems cancelados y órdenes anuladas (solo admin).",
    soloAdmin: true,
    money: [],
    pct: [],
  },
  {
    tipo: "margen",
    label: "Margen",
    descripcion: "Utilidad por producto: ingreso, costo y margen (solo admin).",
    soloAdmin: true,
    money: ["ingreso", "costo", "margen"],
    pct: ["margen_pct"],
    chart: { x: "producto", y: "margen" },
  },
];
