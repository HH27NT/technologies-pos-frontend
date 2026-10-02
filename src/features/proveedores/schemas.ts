import { z } from "zod";

/**
 * Espeja el Form Request de proveedores (M08). Reglas verificadas del backend:
 *  - `nombre` requerido.
 *  - `telefono`, `email` opcionales; vacío = no enviar.
 *
 * El backend es la autoridad final de validación; sus `errors` se mapean encima
 * con form.setError. Nunca se envía `id_establecimiento` (tenant implícito).
 */
export const proveedorSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  telefono: z.string().trim().or(z.literal("")).optional(),
  email: z.string().trim().email("Correo no válido").or(z.literal("")).optional(),
});

export type ProveedorInput = z.infer<typeof proveedorSchema>;
