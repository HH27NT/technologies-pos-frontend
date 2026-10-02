import { z } from "zod";

/**
 * Espeja los Form Request de Órdenes (M11). Reglas verificadas del backend:
 *  - crear → `id_tipo_orden` requerido (1|2|3); `id_mesa` requerido si tipo = mesa.
 *  - agregar/editar ítem → `cantidad` requerida (> 0). `id_producto` al agregar.
 *  - descuento → `descuento` requerido (monto absoluto ≥ 0).
 *
 * Los numéricos se guardan como `number` (el input los convierte en su onChange).
 * El backend es la autoridad final; sus `errors` se mapean con form.setError.
 * Nunca se envía `id_establecimiento` (tenant implícito, regla #4).
 */

export const crearOrdenSchema = z.object({
  id_tipo_orden: z.number({ error: "Elige el tipo de orden" }).int().positive(),
  id_mesa: z.number().int().positive().optional(),
});
export type CrearOrdenInput = z.infer<typeof crearOrdenSchema>;

export const cantidadSchema = z.object({
  cantidad: z
    .number({ error: "La cantidad es obligatoria" })
    .positive("La cantidad debe ser mayor a 0"),
});
export type CantidadInput = z.infer<typeof cantidadSchema>;

export const descuentoSchema = z.object({
  descuento: z
    .number({ error: "El descuento es obligatorio" })
    .nonnegative("El descuento no puede ser negativo"),
});
export type DescuentoInput = z.infer<typeof descuentoSchema>;
