/**
 * Diccionarios para mostrar la auditoría en lenguaje humano. El backend guarda
 * `accion` como `<recurso>.<accion>` (participio) y `entidad` como el nombre de la
 * tabla (plural snake_case). Aquí se traducen a algo legible; lo que no esté en el
 * diccionario se "embellece" automáticamente (sin puntos ni guiones bajos).
 */

const ENTIDADES: Record<string, string> = {
  establecimientos: "Establecimiento",
  sesiones_caja: "Sesión de caja",
  ordenes: "Orden",
  detalle_orden: "Ítem de orden",
  pagos: "Pago",
  tickets: "Ticket",
  movimientos_inventario: "Movimiento de inventario",
  autorizaciones: "Autorización",
  configuraciones: "Configuración",
  productos: "Producto",
  insumos: "Insumo",
  mesas: "Mesa",
  usuarios: "Usuario",
  categorias: "Categoría",
  proveedores: "Proveedor",
  recetas: "Receta",
  impresoras: "Impresora",
  unidades: "Unidad",
};

/** "algo_con.puntos" → "Algo con puntos". */
function embellecer(valor: string): string {
  const limpio = valor.replace(/[._]/g, " ").trim();
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

export function etiquetaEntidad(entidad: string): string {
  return ENTIDADES[entidad] ?? embellecer(entidad);
}

/**
 * Frase en minúscula (verbo + objeto) para el feed de actividad:
 * "**Ana** {frase}" → "Ana registró una entrada de inventario". No incluye id;
 * el id de la entidad se muestra aparte en la línea secundaria del feed.
 */
const FRASES: Record<string, string> = {
  "establecimiento.creado": "creó un establecimiento",
  "establecimiento.actualizado": "actualizó un establecimiento",
  "establecimiento.activado": "activó un establecimiento",
  "establecimiento.desactivado": "desactivó un establecimiento",
  "establecimiento.admin_asignado": "asignó un administrador",
  "establecimiento.acceso_restablecido": "restableció el acceso de un administrador",
  "caja.abierta": "abrió la caja",
  "caja.cerrada": "cerró la caja",
  "orden.creada": "creó una orden",
  "orden.pagada": "cobró una orden",
  "orden.pago_registrado": "registró un pago",
  "orden.item_cancelado": "canceló un ítem",
  "orden.descuento": "aplicó un descuento",
  "orden.anulada": "anuló una orden",
  "inventario.venta": "descontó inventario por una venta",
  "inventario.entrada": "registró una entrada de inventario",
  "inventario.ajuste": "ajustó una existencia",
  "inventario.merma": "registró una merma",
  "ticket.emitido": "emitió un ticket",
  "ticket.reimpreso": "reimprimió un ticket",
  "autorizacion.override": "autorizó una acción con PIN",
  "autorizacion.aprobada": "aprobó una autorización",
  "autorizacion.rechazada": "rechazó una autorización",
  "autorizacion.solicitada": "solicitó una autorización",
  "configuracion.actualizada": "actualizó la configuración",
  "usuario.creado": "creó un usuario",
  "usuario.actualizado": "actualizó un usuario",
  "usuario.activado": "activó un usuario",
  "usuario.desactivado": "desactivó un usuario",
  "usuario.rol_cambiado": "cambió el rol de un usuario",
};

/** Verbo conjugado para el evento CRUD genérico (fallback de acciones sin frase). */
const VERBOS_EVENTO: Record<string, string> = {
  creado: "creó", creada: "creó",
  actualizado: "actualizó", actualizada: "actualizó",
  activado: "activó", activada: "activó",
  desactivado: "desactivó", desactivada: "desactivó",
  eliminado: "eliminó", eliminada: "eliminó",
};

export function fraseAccion(accion: string, entidad: string): string {
  const directa = FRASES[accion];
  if (directa) return directa;

  const evento = accion.includes(".") ? accion.slice(accion.indexOf(".") + 1) : accion;
  const verbo = VERBOS_EVENTO[evento];
  if (verbo) return `${verbo} ${etiquetaEntidad(entidad).toLowerCase()}`;

  return embellecer(accion).toLowerCase();
}

/** Etiquetas legibles de los campos que aparecen en los snapshots antes/después. */
const CAMPOS: Record<string, string> = {
  activo: "Activo", activa: "Activa", disponible: "Disponible",
  nombre: "Nombre", nombre_comercial: "Nombre comercial", descripcion: "Descripción",
  email: "Correo", username: "Usuario", telefono: "Teléfono", direccion: "Dirección",
  rol: "Rol", id_rol: "Rol (id)", estado: "Estado", tipo: "Tipo",
  precio_venta: "Precio de venta", precio_unitario: "Precio unitario",
  costo_referencia: "Costo de referencia", costo_unitario: "Costo unitario",
  stock_actual: "Existencia", stock_minimo: "Stock mínimo", stock_resultante: "Existencia resultante",
  cantidad: "Cantidad", subtotal: "Subtotal", motivo: "Motivo", sku: "SKU",
  razon_social: "Razón social", rfc: "RFC", zona_horaria: "Zona horaria", moneda: "Moneda",
  numero: "Número", zona: "Zona", capacidad: "Capacidad",
  aplica_impuesto: "Aplica impuesto", tasa_impuesto: "Tasa de impuesto",
  impresion_automatica: "Impresión automática", stock_minimo_global: "Stock mínimo global",
  // Referencias: el valor se resuelve al nombre donde hay catálogo (insumo/producto).
  id_insumo: "Insumo", id_producto: "Producto", id_orden: "Orden", id_mesa: "Mesa",
  id_categoria: "Categoría", id_proveedor: "Proveedor", id_unidad_medida: "Unidad",
  id_establecimiento: "Establecimiento", id_usuario: "Usuario",
  monto_inicial: "Monto inicial", monto_contado: "Monto contado", diferencia: "Diferencia",
};

export function etiquetaCampo(campo: string): string {
  return CAMPOS[campo] ?? embellecer(campo);
}

/** Formatea un valor de snapshot a texto legible (Sí/No, vacío como guion). */
export function formatValorAuditoria(valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  if (typeof valor === "number") return String(valor);
  if (typeof valor === "string") return valor;
  return JSON.stringify(valor);
}
