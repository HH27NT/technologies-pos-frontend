/**
 * Tipos del módulo Reportes / Dashboard (M16). Forma verificada contra el backend
 * real: TODOS los reportes comparten el mismo envelope
 * `{ reporte, titulo, rango, columnas[], filas[], resumen }`. Solo se muestran;
 * las cifras llegan calculadas del backend (regla #6). Tenant implícito (regla #4).
 */

/** Rango temporal resuelto por el backend a partir del preset. */
export interface RangoReporte {
  zona_horaria: string;
  /** Preset resuelto (el backend lo normaliza, p. ej. "año" → "anio"). */
  preset: string;
  /** Instantes UTC en ISO 8601. `fin` es EXCLUSIVO: no se muestran tal cual. */
  inicio: string;
  fin: string;
  /** Fechas en la zona del establecimiento; `fin_local` sí es el último día incluido. */
  inicio_local: string;
  fin_local: string;
  /** El rango en palabras, p. ej. "del 1 al 30 de junio de 2026". Lo usa el PDF. */
  etiqueta: string;
  /** El preset en palabras: "Hoy", "Esta semana", "Periodo personalizado"… */
  preset_etiqueta: string;
}

/** Una fila del reporte: claves snake_case en el mismo orden que `columnas`. */
export type FilaReporte = Record<string, string | number | null>;

/** Métricas de resumen del reporte (claves específicas por tipo). */
export type ResumenReporte = Record<string, string | number | null>;

/** Envelope uniforme de cualquier reporte. */
export interface ReporteData {
  reporte: string;
  titulo: string;
  rango: RangoReporte;
  /** Encabezados legibles; `columnas.length` == nº de claves de cada fila. */
  columnas: string[];
  filas: FilaReporte[];
  resumen: ResumenReporte;
}

/** Respuesta de `POST /reportes/exportar`: la generación es asíncrona. */
export interface ExportacionResult {
  id_export: string;
  reporte: string;
  formato: string;
  /** URL absoluta protegida por Bearer; se descarga como blob, no con window.open. */
  descarga_url: string;
}
