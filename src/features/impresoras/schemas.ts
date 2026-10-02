import { z } from "zod";

/**
 * Espeja el Form Request de Impresoras (M13). Reglas verificadas del backend:
 *  - `nombre` requerido.
 *  - `tipo` requerido y válido (barra|cocina|ticket).
 *  - `conexion` opcional (vacío = no enviar).
 *
 * El backend es la autoridad final; sus `errors` se mapean con form.setError.
 * Nunca se envía `id_establecimiento` (tenant implícito, regla #4).
 */
export const impresoraSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  tipo: z.enum(["barra", "cocina", "ticket"], { error: "Elige el tipo de impresora" }),
  conexion: z.string().trim().or(z.literal("")).optional(),
});

export type ImpresoraInput = z.infer<typeof impresoraSchema>;
