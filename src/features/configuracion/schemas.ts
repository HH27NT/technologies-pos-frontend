import { z } from "zod";

/**
 * Espeja el Form Request de Configuración (M03). El backend acepta PUT parcial
 * (todos los campos opcionales); aquí validamos formato/rango localmente y dejamos
 * que el backend sea la autoridad final (sus `errors` se mapean con form.setError).
 *
 * Los numéricos se modelan como `z.number()` (no `z.coerce`) y el input convierte a
 * número en su `onChange`, para no romper la inferencia de RHF (nota técnica Fase 3).
 */
export const configuracionSchema = z.object({
  nombre_comercial: z.string().trim().max(255, "Máximo 255 caracteres").or(z.literal("")),
  telefono_ticket: z.string().trim().max(50, "Máximo 50 caracteres").or(z.literal("")),
  direccion_ticket: z.string().trim().max(255, "Máximo 255 caracteres").or(z.literal("")),
  impresion_automatica: z.boolean(),
  terminal_compartida: z.boolean(),
  bloqueo_terminal_segundos: z
    .number({ error: "Debe ser un número" })
    .int("Deben ser segundos enteros")
    .min(30, "Mínimo 30 segundos")
    .max(3600, "Máximo 3600 segundos (una hora)"),
  stock_minimo_global: z
    .number({ error: "Debe ser un número" })
    .nonnegative("No puede ser negativo")
    .nullable(),
  aplica_impuesto: z.boolean(),
  tasa_impuesto: z
    .number({ error: "Debe ser un número" })
    .min(0, "No puede ser negativo")
    .max(100, "No puede exceder 100%")
    .nullable(),
});

export type ConfiguracionInput = z.infer<typeof configuracionSchema>;
