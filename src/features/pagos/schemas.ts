import { z } from "zod";

/**
 * Espeja el Form Request de Pagos (M12). Reglas verificadas del backend:
 *  - `id_tipo_pago` requerido y válido (1|2|3).
 *  - `monto` requerido (> 0). En efectivo puede exceder el saldo (genera cambio);
 *    en tarjeta/transferencia el backend rechaza el sobrepago.
 *  - `referencia` opcional (texto libre; útil en tarjeta/transferencia).
 *
 * El numérico `monto` se guarda como `number` (el input lo convierte en su
 * onChange). El backend es la autoridad final; sus `errors` se mapean encima.
 * Nunca se envía `id_establecimiento` (tenant implícito, regla #4).
 */
export const pagoSchema = z.object({
  id_tipo_pago: z.number({ error: "Elige el tipo de pago" }).int().positive(),
  monto: z
    .number({ error: "El monto es obligatorio" })
    .positive("El monto debe ser mayor a 0"),
  referencia: z.string().trim().or(z.literal("")).optional(),
});

export type PagoInput = z.infer<typeof pagoSchema>;
