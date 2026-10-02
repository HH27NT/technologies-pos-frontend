import { z } from "zod";
// Primitivas de PIN (6 dígitos + regla anti-trivial). Se importa el módulo hoja, no
// el barrel de la feature, para no arrastrar sus pantallas a este chunk.
import { pinEsTrivial, pinSchema } from "@/features/autorizaciones/schemas";

/**
 * Espeja el Form Request de usuarios (M04). Reglas observadas del backend:
 *  - `nombre` requerido.
 *  - `email` / `username`: al menos uno (required_without mutuo).
 *  - `password`: requerido al crear; en edición es opcional (vacío = no cambiar).
 *  - `rol`: requerido, es el NOMBRE del rol (string: "admin", "operador", …).
 *
 * El backend es la autoridad final de validación; sus `errors` se mapean encima
 * de estos con form.setError. Nunca se envía `id_establecimiento` (tenant implícito).
 */

const emailField = z
  .string()
  .trim()
  .email("Correo no válido")
  .or(z.literal(""))
  .optional();

const usernameField = z
  .string()
  .trim()
  .min(3, "Mínimo 3 caracteres")
  .or(z.literal(""))
  .optional();

/** Base común a crear/editar (sin password, que difiere entre ambos). */
const baseUsuario = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  email: emailField,
  username: usernameField,
  rol: z.string().min(1, "Selecciona un rol"),
});

/** Al menos email o username (regla required_without del backend). */
const alMenosUnIdentificador = (data: { email?: string; username?: string }) =>
  Boolean(data.email?.trim()) || Boolean(data.username?.trim());

const mensajeIdentificador = {
  message: "Indica un correo o un usuario",
  path: ["username"] satisfies PropertyKey[],
};

/** Alta: password obligatorio. */
export const crearUsuarioSchema = baseUsuario
  .extend({
    password: z.string().min(8, "Mínimo 8 caracteres"),
  })
  .refine(alMenosUnIdentificador, mensajeIdentificador);

/** Edición: password opcional (si viene vacío, no se cambia). */
export const editarUsuarioSchema = baseUsuario
  .extend({
    password: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .or(z.literal(""))
      .optional(),
  })
  .refine(alMenosUnIdentificador, mensajeIdentificador);

/**
 * PIN de mesero (espejo de `FijarMeseroPinRequest`: `digits:6` + `PinNoTrivial`).
 * `pinSchema` y `pinEsTrivial` se reutilizan de Autorizaciones porque la regla del
 * backend es la misma; **el secreto no**: son tablas y conceptos distintos (este
 * identifica, jamás autoriza).
 *
 * La confirmación es cosa del frontend, no del backend: el PIN no se puede volver a
 * consultar, así que un dedazo al fijarlo dejaría al mesero sin poder firmar y sin
 * manera de averiguar por qué.
 */
export const meseroPinSchema = z
  .object({
    pin: pinSchema.refine(
      (pin) => !pinEsTrivial(pin),
      "El PIN es demasiado predecible. Evita dígitos repetidos o secuencias.",
    ),
    pin_confirmation: z.string(),
  })
  .refine((v) => v.pin === v.pin_confirmation, {
    path: ["pin_confirmation"],
    message: "La confirmación del PIN no coincide",
  });

export type MeseroPinInput = z.infer<typeof meseroPinSchema>;

export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>;
export type EditarUsuarioInput = z.infer<typeof editarUsuarioSchema>;
/** Unión de conveniencia para el formulario compartido (crear/editar). */
export type UsuarioFormInput = z.infer<typeof editarUsuarioSchema>;
