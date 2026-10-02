import { z } from "zod";

/**
 * Espeja el Form Request de productos (M06). Reglas verificadas del backend:
 *  - `nombre` requerido.
 *  - `id_categoria` requerido (entero positivo).
 *  - `precio_venta` requerido (≥ 0).
 *  - `descripcion`, `costo_referencia`, `sku` opcionales; vacío = no enviar.
 *  - `controla_inventario` booleano.
 *
 * Los campos numéricos se guardan como `number` (el input los convierte en su
 * onChange), así el tipo de entrada y salida del schema coinciden y RHF infiere
 * bien. El backend es la autoridad final de validación; sus `errors` se mapean
 * encima con form.setError. Nunca se envía `id_establecimiento` (tenant implícito).
 */
export const productoSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  id_categoria: z.number().int().positive("Selecciona una categoría"),
  precio_venta: z
    .number({ error: "El precio es obligatorio" })
    .nonnegative("El precio no puede ser negativo"),
  descripcion: z.string().trim().or(z.literal("")).optional(),
  costo_referencia: z.number().nonnegative("No puede ser negativo").optional(),
  sku: z.string().trim().or(z.literal("")).optional(),
  controla_inventario: z.boolean(),
  /**
   * Atajo de alta: no viaja como campo al backend. Decide **dónde** va el costo
   * capturado (al insumo que se crea, o a `costo_referencia`) y si el alta debe
   * crear además el insumo y la receta 1:1.
   */
  sale_del_almacen: z.boolean(),
});

export type ProductoInput = z.infer<typeof productoSchema>;
