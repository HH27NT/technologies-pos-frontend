import { z } from "zod";

/**
 * Espeja el Form Request de categorías (M05). El formulario solo captura `nombre`:
 * `orden_display` existe en el backend (entero ≥ 0) pero **no se pregunta** — el
 * alta lo calcula como el final de la lista y la tabla lo cambia con las flechas,
 * que es donde se ve el menú completo.
 *
 * El backend es la autoridad final de validación; sus `errors` se mapean encima con
 * form.setError. Nunca se envía `id_establecimiento` (tenant implícito).
 */
export const categoriaSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
});

export type CategoriaInput = z.infer<typeof categoriaSchema>;
