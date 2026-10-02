/**
 * Tipos del módulo Plataforma / Establecimientos (M02). Solo super_admin. Forma
 * verificada contra el backend real (GET/POST/PUT /establecimientos). El `activar`
 * alterna `activo`. Es el único módulo que cruza tenants: aquí SÍ se maneja el
 * establecimiento como entidad (regla #4 aplica a los demás módulos, no a éste).
 */

/** Configuración embebida que el backend devuelve dentro del establecimiento. */
export interface ConfiguracionEmbebida {
  id: number;
  nombre_comercial: string | null;
  telefono_ticket: string | null;
  direccion_ticket: string | null;
  impresion_automatica: boolean;
  stock_minimo_global: number | string | null;
  aplica_impuesto: boolean;
  tasa_impuesto: number | string | null;
}

/** Resource de un establecimiento. */
export interface EstablecimientoRecurso {
  id: number;
  nombre: string;
  razon_social: string | null;
  rfc: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  logo_url: string | null;
  zona_horaria: string;
  moneda: string;
  activo: boolean;
  /** Presente en lista/alta; el endpoint de activar la omite. */
  configuracion?: ConfiguracionEmbebida | null;
  created_at: string;
  updated_at: string;
}

/**
 * Administrador de un establecimiento (subconjunto del UsuarioResource del backend).
 * Alimenta el selector del rescate de acceso: se elige de una lista, nunca por id.
 */
export interface AdministradorRecurso {
  id: number;
  nombre: string;
  email: string | null;
  username: string | null;
  activo: boolean;
}

/** Respuesta del rescate: la contraseña temporal se muestra una única vez. */
export interface RestablecerAccesoResultado {
  password_temporal: string;
  usuario: AdministradorRecurso;
}
