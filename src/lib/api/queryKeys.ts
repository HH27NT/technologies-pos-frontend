/**
 * Fábrica jerárquica de query keys para TanStack Query.
 *
 * Convención por recurso:
 *   all         → invalida todo el recurso (listas + detalles)
 *   list(p?)    → una lista con filtros/paginación `p`
 *   detail(id)  → un recurso puntual
 *
 * Invalida con `qc.invalidateQueries({ queryKey: qk.<recurso>.all })` tras mutar.
 */

/** Helper para no repetir el patrón all/list/detail en cada recurso. */
function resource<const K extends string>(key: K) {
  return {
    all: [key] as const,
    list: (params?: unknown) => [key, "list", params] as const,
    detail: (id: number | string) => [key, "detail", id] as const,
  };
}

export const qk = {
  // M01 · Sesión
  auth: {
    me: ["auth", "me"] as const,
  },

  // M02 · Plataforma
  establecimientos: {
    ...resource("establecimientos"),
    administradores: (id: number | string) =>
      ["establecimientos", "administradores", id] as const,
  },

  // M03 · Configuración (singleton)
  configuracion: {
    all: ["configuracion"] as const,
  },

  // M04 · Usuarios y roles
  usuarios: resource("usuarios"),
  roles: resource("roles"),
  /**
   * PIN de mesero de un usuario (terminal compartida). Cuelga de `/usuarios/{id}`
   * pero se cachea aparte: el estado del PIN se consulta al abrir su diálogo, no
   * al pintar la lista.
   */
  meseroPin: {
    all: ["mesero-pin"] as const,
    detail: (id: number) => ["mesero-pin", "detail", id] as const,
  },

  // M05/M06 · Catálogo
  categorias: resource("categorias"),
  productos: resource("productos"),

  // M07 · Recetas
  recetas: resource("recetas"),

  // M08 · Inventario
  proveedores: resource("proveedores"),
  unidadesMedida: resource("unidades-medida"),
  insumos: {
    ...resource("insumos"),
    kardex: (id: number | string) => ["insumos", "kardex", id] as const,
  },
  movimientos: resource("movimientos"),

  // M09 · Mesas
  mesas: resource("mesas"),

  // M13 · Impresoras / tickets
  impresoras: resource("impresoras"),
  tickets: resource("tickets"),

  // M10 · Caja
  caja: {
    actual: ["caja", "actual"] as const,
    historico: (params?: unknown) => ["caja", "historico", params] as const,
  },

  // M11 · Órdenes
  ordenes: {
    ...resource("ordenes"),
    saldo: (id: number | string) => ["ordenes", "saldo", id] as const,
  },

  // M11 · Terminal compartida (modo del tenant; el POS pregunta si debe pedir PIN)
  terminal: {
    modo: ["terminal", "modo"] as const,
  },

  // M12 · Pagos (anidados en la orden; no hay listado propio en V1)
  pagos: {
    deOrden: (idOrden: number | string) => ["ordenes", idOrden, "pagos"] as const,
  },

  // M14 · Autorizaciones (+ M14.1: PIN propio del autorizador, singleton)
  autorizaciones: resource("autorizaciones"),
  miPin: {
    all: ["mi-pin"] as const,
  },

  // M15 · Auditoría
  auditoria: resource("auditoria"),

  // M16 · Reportes. Una sola raíz a propósito: `useReporte` arma la key con el slug del
  // reporte (`[...all, tipo, params]`), así que agregar un reporte NO exige tocar este
  // archivo. Aquí hubo siete claves nombradas —una por reporte— que nadie llamaba nunca.
  reportes: {
    all: ["reportes"] as const,
  },
} as const;
