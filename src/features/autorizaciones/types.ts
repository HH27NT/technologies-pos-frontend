/**
 * Tipos del módulo Autorizaciones (M14 + M14.1 PIN). Forma verificada contra el
 * backend real. Hay dos caminos para una operación sensible (regla de oro #7):
 *
 *  - OVERRIDE (síncrono): el operador teclea el PIN de 6 dígitos de un admin en el
 *    endpoint de la acción; se ejecuta al instante y queda registrada con
 *    `metodo = "override"`. Ver `AutorizacionOverride`.
 *  - ASÍNCRONO (respaldo): el operador SOLICITA (POST /autorizaciones) y el admin
 *    APRUEBA desde la bandeja, lo que EJECUTA la acción en el backend.
 */

export type EstadoAutorizacion = "pendiente" | "aprobada" | "rechazada";

/** Cómo se resolvió: bandeja asíncrona u override con PIN de admin. */
export type MetodoAutorizacion = "asincrono" | "override";

/** Tipos de autorización confirmados por el backend (enum fijo). */
export type TipoAutorizacion =
  | "cancelar_item"
  | "anular_orden"
  | "entrada_stock"
  | "ajuste_stock";

/**
 * Bloque de override que el operador adjunta a la operación sensible: el PIN de 6
 * dígitos de un admin, que el backend verifica contra `autorizacion_pins` del mismo
 * establecimiento. La acción se ejecuta al instante y queda registrada en
 * `autorizaciones` (metodo=override). Se envía PLANO en el body del endpoint de la
 * acción (no anidado).
 *
 * El PIN es de un solo uso: no se guarda en estado global, storage ni logs.
 */
export interface AutorizacionOverride {
  motivo: string;
  /** PIN del admin autorizador (6 dígitos). */
  autorizacion_pin: string;
  /** Terminal del POS. Opcional: solo alimenta la bitácora de intentos. */
  terminal?: string;
}

/**
 * Referencias de la operación para el respaldo asíncrono (POST /autorizaciones).
 * El backend exige unas u otras según el `tipo` (SolicitarAutorizacionRequest):
 * cancelar_item → id_orden + id_item; anular_orden → id_orden;
 * entrada_stock/ajuste_stock → id_insumo + cantidad (costo_unitario opcional).
 */
export interface RefsAutorizacion {
  id_orden?: number;
  id_item?: number;
  id_insumo?: number;
  cantidad?: number;
  costo_unitario?: number;
}

/** Qué operación se está autorizando; alimenta el respaldo asíncrono del diálogo. */
export interface SolicitudAutorizacion {
  tipo: TipoAutorizacion;
  refs: RefsAutorizacion;
}

/**
 * Estado del PIN propio (GET/PUT/DELETE /mi-pin). El backend NUNCA devuelve el PIN:
 * solo si está configurado y desde cuándo.
 */
export interface EstadoPin {
  configurado: boolean;
  actualizado_at: string | null;
}

/** Una solicitud de autorización. `solicitante` solo viene en el listado. */
export interface Autorizacion {
  id: number;
  tipo: string;
  /** Entidad afectada (p. ej. "detalle_orden", "ordenes"). */
  entidad: string;
  entidad_id: number;
  estado: EstadoAutorizacion;
  motivo: string;
  /** Referencias de la operación (id_orden, id_item, id_insumo, cantidad…). */
  datos: Record<string, number> | null;
  id_usuario_solicita: number;
  id_usuario_autoriza: number | null;
  resuelta_at: string | null;
  created_at: string;
  /** Origen de la resolución (bandeja asíncrona u override con PIN). */
  metodo?: MetodoAutorizacion;
  /** Nombre del solicitante (solo en el listado). */
  solicitante?: string;
}
