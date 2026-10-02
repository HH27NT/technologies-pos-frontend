/**
 * Tipos del módulo Impresoras (M13). Forma verificada contra el backend real
 * (GET/POST /impresoras). El `activar` del backend alterna `activa`.
 */

/** Resource de una impresora. */
export interface ImpresoraRecurso {
  id: number;
  nombre: string;
  /** Enum confirmado: barra | cocina | ticket. */
  tipo: string;
  /** Cadena de conexión (IP, USB…). Opcional. */
  conexion: string | null;
  activa: boolean | null;
}
