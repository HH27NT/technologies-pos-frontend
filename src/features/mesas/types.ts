/**
 * Tipos del módulo Mesas (M09). Reflejan el Resource del backend (el `data` ya
 * desenvuelto por el cliente Axios). Forma verificada contra el backend real
 * (GET/POST /mesas). Nota: el campo de activación es `activa` (femenino).
 */

/** Resource de una mesa. */
export interface MesaRecurso {
  id: number;
  numero: number;
  nombre: string | null;
  zona: string | null;
  capacidad: number | null;
  /** El `activar` del backend alterna este campo. */
  activa: boolean | null;
  /** Estado operativo de la mesa ("libre", "ocupada"…). Solo lectura. */
  estado: string;
}
