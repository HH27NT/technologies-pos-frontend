/**
 * Tipos del módulo Productos (M06). Reflejan el Resource del backend
 * (el `data` ya desenvuelto por el cliente Axios). Forma verificada contra el
 * backend real (GET/POST /productos).
 *
 * Los importes (`precio_venta`, `costo_referencia`) llegan como **string** y
 * congelados (regla de oro #6): aquí solo se muestran, nunca se recalculan.
 */

/** Categoría anidada dentro del Resource de producto. */
export interface CategoriaMini {
  id: number;
  nombre: string;
  orden_display: number | null;
  activo: boolean | null;
}

/** Resource de un producto. */
export interface ProductoRecurso {
  id: number;
  id_categoria: number;
  nombre: string;
  descripcion: string | null;
  /** Decimal como string (congelado). */
  precio_venta: string;
  /** Decimal como string; puede venir nulo. */
  costo_referencia: string | null;
  controla_inventario: boolean | null;
  /** El `activar` del backend alterna este campo (producto disponible en venta). */
  disponible: boolean | null;
  sku: string | null;
  categoria: CategoriaMini;
}
