import { z } from "zod";

/**
 * Espeja el `GuardarRolRequest` del backend (M04 · editor de roles).
 *
 * El backend es la autoridad final: aplica además la CONTENCIÓN DE PRIVILEGIOS (no
 * puedes otorgar un permiso que tú no tienes) y reserva las etiquetas de los roles del
 * sistema. Eso no se replica aquí —dependen de la sesión y del catálogo— y llega como
 * `errors` del envelope, que se mapean sobre los campos.
 */
export const rolSchema = z.object({
  etiqueta: z
    .string()
    .trim()
    .min(1, "Ponle un nombre al rol")
    .max(60, "Máximo 60 caracteres"),
  descripcion: z
    .string()
    .trim()
    .max(200, "Máximo 200 caracteres")
    .or(z.literal(""))
    .optional(),
  permisos: z.array(z.string()).min(1, "Selecciona al menos un permiso"),
});

export type RolFormInput = z.infer<typeof rolSchema>;
