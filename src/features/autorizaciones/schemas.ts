import { z } from "zod";

/**
 * Esquemas de Autorizaciones (M14 + M14.1). Espejan los Form Requests del backend
 * (`SolicitarAutorizacionRequest`, `GuardarPinRequest` y el bloque de override de los
 * 4 endpoints sensibles): la validación local solo evita viajes obvios; la verdad la
 * tiene el backend y sus mensajes se muestran tal cual (regla de oro #2).
 */

/** Solicitud asíncrona (POST /autorizaciones): las refs las arma la UI según el tipo. */
export const solicitudSchema = z.object({
  motivo: z.string().trim().min(1, "El motivo es obligatorio"),
});
export type SolicitudInput = z.infer<typeof solicitudSchema>;

/** PIN de autorización: exactamente 6 dígitos (espejo de `digits:6`). */
export const pinSchema = z
  .string()
  .regex(/^\d{6}$/, "El PIN debe tener exactamente 6 dígitos");

/**
 * Espejo de `App\Support\Rules\PinNoTrivial`: rechaza los PIN que un atacante
 * probaría primero — todos los dígitos iguales (111111) y las secuencias
 * consecutivas ascendentes o descendentes (123456, 987654).
 */
export function pinEsTrivial(pin: string): boolean {
  if (!/^\d{6}$/.test(pin)) return false;

  if (new Set(pin).size === 1) return true;

  return [1, -1].some((paso) =>
    [...pin].every(
      (digito, i) => i === 0 || Number(digito) === Number(pin[i - 1]) + paso,
    ),
  );
}

/** Override del operador (PIN del admin + motivo), plano en el body de la acción. */
export const overrideSchema = z.object({
  autorizacion_pin: pinSchema,
  motivo: z.string().trim().min(1, "El motivo es obligatorio"),
});
export type OverrideInput = z.infer<typeof overrideSchema>;

/** Formulario self-service de `PUT /mi-pin`. */
export const guardarPinSchema = z
  .object({
    pin: pinSchema.refine(
      (pin) => !pinEsTrivial(pin),
      "El PIN es demasiado predecible. Evita dígitos repetidos o secuencias.",
    ),
    pin_confirmation: z.string(),
    password_actual: z.string().min(1, "Debes confirmar tu contraseña actual"),
  })
  .refine((v) => v.pin === v.pin_confirmation, {
    path: ["pin_confirmation"],
    message: "La confirmación del PIN no coincide",
  });
export type GuardarPinInput = z.infer<typeof guardarPinSchema>;
