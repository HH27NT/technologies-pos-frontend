import type { UnidadRecurso } from "@/features/unidades";
import type { ProductoRecurso } from "@/features/productos";

/**
 * Tipos del módulo Recetas / BOM (M07). Reflejan el Resource del backend
 * (el `data` ya desenvuelto). Forma verificada contra el backend real
 * (GET/POST /recetas). Una receta es un renglón que liga un producto con un
 * insumo y la cantidad que consume al venderse.
 */

/** Producto anidado (mínimo) dentro del Resource de receta. */
export interface ProductoMini {
  id: number;
  nombre: string;
}

/**
 * Insumo anidado dentro del Resource de receta.
 *
 * `GET /recetas` carga `insumo.unidadMedida` a propósito, para que el armador pinte la
 * unidad y estime el costo sin tener que encontrar ese insumo en el catálogo que trae
 * aparte (que está paginado y buscado: el insumo puede no venir en la página actual).
 * Los demás endpoints de receta no cargan la relación, así que va opcional.
 */
export interface InsumoDeReceta {
  id: number;
  nombre: string;
  costo_unitario?: string | null;
  unidad_medida?: UnidadRecurso;
}

/**
 * Renglón de receta tal como viaja **dentro** de un producto
 * (`GET /productos?con_recetas=1`): sin repetir el producto, que ya se sabe cuál es.
 */
export interface RenglonDeReceta {
  id: number;
  id_producto: number;
  id_insumo: number;
  cantidad: string;
  insumo: InsumoDeReceta;
}

/** Resource de un renglón de receta pedido a `/recetas`, que sí nombra su producto. */
export interface RecetaRecurso extends RenglonDeReceta {
  producto: ProductoMini;
}

/**
 * Un producto con la receta que consume. Es la fila de la pantalla de Recetas: la
 * lista es **de productos**, no de renglones — un producto con cinco insumos es una
 * receta, no cinco. `recetas` vacío significa "todavía no tiene", y solo viene
 * cuando el índice se pide con `con_recetas`.
 */
export interface ProductoConReceta extends ProductoRecurso {
  recetas: RenglonDeReceta[];
}
