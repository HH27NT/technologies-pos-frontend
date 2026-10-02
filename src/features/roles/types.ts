/**
 * Tipos del módulo Roles (M04 · editor de roles a medida). Reflejan los Resource
 * del backend (el `data` ya desenvuelto por el cliente Axios).
 */

/** Forma del Resource de un rol (GET /roles). El `name` es el identificador técnico. */
export interface RolRecurso {
  id: number;
  /** Identificador de Spatie (slug). Es lo que se envía al asignar un rol. */
  name: string;
  /** Nombre legible del rol a medida. Nulo en los presets: se etiquetan por `name`. */
  etiqueta: string | null;
  descripcion: string | null;
  id_establecimiento: number | null;
  /** Preset del catálogo: solo lectura, se clona en vez de editarse. */
  es_sistema: boolean;
  permisos: string[];
  /** Cuántos usuarios lo tienen. Solo viene en el listado del tenant. */
  usuarios_count?: number;
}

/** Un permiso del catálogo, ya etiquetado en español por el backend. */
export interface PermisoCatalogo {
  nombre: string;
  etiqueta: string;
  descripcion: string;
}

/** Grupo de permisos por módulo (GET /roles/permisos). */
export interface GrupoPermisos {
  grupo: string;
  etiqueta: string;
  permisos: PermisoCatalogo[];
}
