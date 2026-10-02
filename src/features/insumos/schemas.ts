import { z } from "zod";

/**
 * Espeja los Form Requests de insumos y movimientos (M08). Reglas verificadas:
 *
 * Insumo:
 *  - `nombre` requerido.
 *  - `id_unidad_medida` requerido (entero positivo).
 *  - `tipo` opcional en el backend (default `controlado`); aquí siempre se manda.
 *  - `stock_minimo`, `costo_unitario`, `id_proveedor` opcionales.
 *  - `stock_actual` NO se captura aquí (read-only, se mueve con movimientos).
 *  - `stock_inicial` (solo alta): atajo de UI que el backend traduce a un
 *    movimiento de entrada real en la misma transacción. El backend lo rechaza
 *    en edición, así que el formulario solo lo manda al crear.
 *
 * Movimiento:
 *  - `id_insumo`, `tipo` (entrada/merma; `ajuste` sigue existiendo en el backend
 *    mismo pero este diálogo ya no lo ofrece, ver MovimientoDialog), `cantidad` (> 0) requeridos.
 *  - `motivo`, `costo_unitario` opcionales (costo aplica a entradas).
 *
 * Los campos numéricos se guardan como `number` (el input convierte en onChange),
 * así el tipo de entrada y salida del schema coinciden y RHF infiere bien.
 */
export const insumoSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  id_unidad_medida: z.number().int().positive("Selecciona una unidad"),
  tipo: z.enum(["controlado", "consumo"]),
  stock_minimo: z.number().nonnegative("No puede ser negativo").optional(),
  costo_unitario: z.number().nonnegative("No puede ser negativo").optional(),
  id_proveedor: z.number().int().positive().optional(),
  stock_inicial: z.number().positive("Debe ser mayor a 0").optional(),
});

export type InsumoInput = z.infer<typeof insumoSchema>;

export const movimientoSchema = z.object({
  tipo: z.enum(["entrada", "ajuste", "merma"], { error: "Selecciona un tipo" }),
  cantidad: z.number({ error: "La cantidad es obligatoria" }).positive("Debe ser mayor a 0"),
  motivo: z.string().trim().or(z.literal("")).optional(),
  costo_unitario: z.number().nonnegative("No puede ser negativo").optional(),
});

export type MovimientoInput = z.infer<typeof movimientoSchema>;
