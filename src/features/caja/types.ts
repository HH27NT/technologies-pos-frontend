/**
 * Tipos del módulo Caja (M10). Reflejan el Resource del backend (el `data` ya
 * desenvuelto por el cliente Axios). Forma verificada contra el backend real
 * (GET /caja/actual, GET /caja/historico, POST /caja/abrir, POST /caja/cerrar).
 *
 * Los importes (`monto_inicial`, `monto_sistema`, `monto_contado`, `diferencia`)
 * llegan CONGELADOS del backend como string (regla de oro #6): solo se muestran,
 * nunca se recalculan. En particular `diferencia = monto_contado - monto_sistema`
 * la calcula el backend al cerrar.
 */

/** Usuario embebido en la sesión de caja (apertura/cierre). */
export interface UsuarioCaja {
  id: number;
  id_establecimiento: number | null;
  nombre: string;
  email: string | null;
  username: string;
  activo: boolean;
  id_rol: number | null;
  es_super_admin: boolean;
  roles: string[];
}

export type EstadoCaja = "abierta" | "cerrada";

/** Resource de una sesión de caja. */
export interface CajaSesion {
  id: number;
  estado: EstadoCaja;
  monto_inicial: string;
  /** Efectivo esperado según el sistema (solo tras cerrar). */
  monto_sistema: string | null;
  /** Efectivo contado físicamente al cerrar. */
  monto_contado: string | null;
  /** contado − sistema, congelado del backend. Negativo = faltante. */
  diferencia: string | null;
  /** Nota del cierre (opcional). */
  motivo: string | null;
  id_usuario_apertura: number;
  id_usuario_cierre: number | null;
  abierta_at: string;
  cerrada_at: string | null;
  usuario_apertura: UsuarioCaja;
  usuario_cierre?: UsuarioCaja | null;
}
