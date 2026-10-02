/**
 * Tipos del módulo Auditoría (M15). Forma verificada contra el backend real
 * (GET /auditoria y GET /auditoria/global). Es un ledger de solo lectura: cada
 * registro guarda el antes/después de una acción sensible.
 */

/** Contenido arbitrario de un snapshot de auditoría (el backend lo arma por acción). */
export type SnapshotAuditoria = Record<string, unknown> | unknown[] | null;

/** Resource de un registro de auditoría. */
export interface RegistroAuditoria {
  id: number;
  /** Acción registrada, p. ej. "inventario.venta", "configuracion.actualizada". */
  accion: string;
  /** Tabla/entidad afectada, p. ej. "movimientos_inventario". */
  entidad: string;
  entidad_id: number | null;
  id_usuario: number | null;
  id_establecimiento: number | null;
  /** Nombre del usuario que ejecutó la acción (desnormalizado por el backend). */
  usuario: string | null;
  datos_antes: SnapshotAuditoria;
  datos_despues: SnapshotAuditoria;
  ip: string | null;
  created_at: string;
}
