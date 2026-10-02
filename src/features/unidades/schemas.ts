import { z } from "zod";

/**
 * Espeja el Form Request de unidades de medida (M08). Reglas verificadas:
 *  - `nombre` requerido.
 *  - `abreviacion` opcional; vacío = no enviar.
 *
 * El backend es la autoridad final de validación; sus `errors` se mapean encima
 * con form.setError. Nunca se envía `id_establecimiento` (tenant implícito).
 */
export const unidadSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  abreviacion: z.string().trim().or(z.literal("")).optional(),
});

export type UnidadInput = z.infer<typeof unidadSchema>;
