/**
 * Tipos del módulo Proveedores (M08). Reflejan el Resource del backend
 * (el `data` ya desenvuelto por el cliente Axios). Forma verificada contra el
 * backend real (GET/POST /proveedores).
 */

/** Resource de un proveedor. */
export interface ProveedorRecurso {
  id: number;
  nombre: string;
  telefono: string | null;
  email: string | null;
  /** El `activar` del backend alterna este campo; nulo en la respuesta de creación. */
  activo: boolean | null;
}
