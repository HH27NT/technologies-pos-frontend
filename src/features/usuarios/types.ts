/**
 * Tipos del módulo Usuarios y roles (M04). Reflejan los Resource del backend
 * (el `data` ya desenvuelto por el cliente Axios).
 */

/** Forma del Resource de un usuario (GET /usuarios, GET /usuarios/{id}). */
export interface UsuarioRecurso {
  id: number;
  id_establecimiento: number | null;
  nombre: string;
  email: string | null;
  username: string | null;
  activo: boolean;
  id_rol: number | null;
  es_super_admin: boolean;
  /** Nombres de rol asignados (spatie). Suele venir vacío si se usa id_rol. */
  roles: string[];
}

// El Resource de rol (`RolRecurso`) vive en `features/roles/types`: los roles dejaron
// de ser un catálogo fijo del módulo de usuarios cuando llegó el editor a medida.

/**
 * Estado del PIN de mesero de un usuario (GET/PUT/DELETE /usuarios/{id}/mesero-pin).
 * El backend **nunca** devuelve el PIN, ni a quien lo fijó: solo si existe y desde
 * cuándo. Un PIN olvidado se reemplaza, no se consulta.
 */
export interface EstadoMeseroPin {
  configurado: boolean;
  actualizado_at: string | null;
}
