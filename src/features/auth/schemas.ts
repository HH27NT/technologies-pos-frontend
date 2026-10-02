import { z } from "zod";

/**
 * Espeja el Form Request de POST /auth/login. El backend acepta usuario o correo
 * en el campo `login`. Los mensajes de validación de campo del backend (envelope
 * `errors`) se mapean encima de estos con form.setError.
 */
export const loginSchema = z.object({
  login: z.string().min(1, "Ingresa tu usuario o correo"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

export type LoginInput = z.infer<typeof loginSchema>;
