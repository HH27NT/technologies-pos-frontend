import { z } from "zod";

/**
 * Espeja los Form Request de Caja (M10). Reglas verificadas del backend:
 *  - abrir → `monto_inicial` requerido (≥ 0).
 *  - cerrar → `monto_contado` requerido (≥ 0); `motivo` opcional (vacío = no enviar).
 *
 * Los montos se guardan como `number` (el input los convierte en su onChange), así
 * el tipo de entrada y salida del schema coinciden y RHF infiere bien. El backend
 * es la autoridad final de validación; sus `errors` se mapean con form.setError.
 * Nunca se envía `id_establecimiento` (tenant implícito, regla #4).
 */

export const abrirCajaSchema = z.object({
  monto_inicial: z
    .number({ error: "El monto inicial es obligatorio" })
    .nonnegative("El monto no puede ser negativo"),
});

export type AbrirCajaInput = z.infer<typeof abrirCajaSchema>;

export const cerrarCajaSchema = z.object({
  monto_contado: z
    .number({ error: "El monto contado es obligatorio" })
    .nonnegative("El monto no puede ser negativo"),
  motivo: z.string().trim().or(z.literal("")).optional(),
});

export type CerrarCajaInput = z.infer<typeof cerrarCajaSchema>;
