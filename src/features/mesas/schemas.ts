import { z } from "zod";

/**
 * Espeja el Form Request de mesas (M09). Reglas verificadas del backend:
 *  - `numero` requerido (entero positivo).
 *  - `nombre`, `zona` opcionales; vacío = no enviar.
 *  - `capacidad` opcional (entero ≥ 1).
 *
 * Los campos numéricos se guardan como `number` (el input los convierte en su
 * onChange), así el tipo de entrada y salida del schema coinciden y RHF infiere
 * bien. El backend es la autoridad final de validación; sus `errors` se mapean
 * encima con form.setError. Nunca se envía `id_establecimiento` (tenant implícito).
 */
export const mesaSchema = z.object({
  numero: z.number().int().positive("El número es obligatorio"),
  nombre: z.string().trim().or(z.literal("")).optional(),
  zona: z.string().trim().or(z.literal("")).optional(),
  capacidad: z.number().int().min(1, "Mínimo 1").optional(),
});

export type MesaInput = z.infer<typeof mesaSchema>;
