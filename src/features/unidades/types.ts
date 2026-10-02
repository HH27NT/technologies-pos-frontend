/**
 * Tipos del módulo Unidades de medida (M08). Reflejan el Resource del backend
 * (el `data` ya desenvuelto por el cliente Axios). Forma verificada contra el
 * backend real (GET/POST /unidades-medida).
 */

/** Resource de una unidad de medida. */
export interface UnidadRecurso {
  id: number;
  nombre: string;
  abreviacion: string | null;
  /** Las globales (`true`) son de solo lectura: no se editan ni se borran. */
  es_global: boolean;
}
