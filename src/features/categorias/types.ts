/**
 * Tipos del módulo Categorías (M05). Reflejan el Resource del backend
 * (el `data` ya desenvuelto por el cliente Axios). Forma verificada contra el
 * backend real (GET/POST /categorias).
 */

/** Resource de una categoría. */
export interface CategoriaRecurso {
  id: number;
  nombre: string;
  /** Orden de presentación en venta; puede venir nulo. */
  orden_display: number | null;
  /** El backend puede devolver `null` en la respuesta de creación; en listas es booleano. */
  activo: boolean | null;
}
