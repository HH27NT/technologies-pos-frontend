import { z } from "zod";

/**
 * Espeja el Form Request de Establecimientos (M02). Reglas verificadas del backend:
 *  - Crear exige `nombre` + un objeto `admin` { nombre, username, password, email? }:
 *    el backend crea el establecimiento y su administrador en un solo paso. El
 *    identificador principal del admin es el `username`; el `email` es opcional.
 *  - Editar solo actualiza los datos del establecimiento (sin `admin`).
 *
 * El backend es la autoridad final; sus `errors` (incluidos los anidados como
 * `admin.email`) se mapean con form.setError.
 */

const opcional = z.string().trim().max(255, "Máximo 255 caracteres").or(z.literal(""));

/** Campos del establecimiento comunes a crear y editar. */
const establecimientoBase = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(255, "Máximo 255 caracteres"),
  razon_social: opcional,
  rfc: z.string().trim().max(20, "Máximo 20 caracteres").or(z.literal("")),
  direccion: opcional,
  telefono: z.string().trim().max(50, "Máximo 50 caracteres").or(z.literal("")),
  email: z.string().trim().email("Correo inválido").or(z.literal("")),
  zona_horaria: z.string().trim().min(1, "La zona horaria es obligatoria"),
  moneda: z.string().trim().min(1, "La moneda es obligatoria").max(10, "Máximo 10 caracteres"),
});

/**
 * Datos del administrador inicial (solo al crear). El identificador principal es el
 * `username`; el `email` es opcional (el backend lo acepta nulo: `required_without`).
 */
const adminSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre del administrador es obligatorio"),
  username: z.string().trim().min(3, "El usuario es obligatorio (mínimo 3 caracteres)"),
  email: z.string().trim().email("Correo inválido").or(z.literal("")).optional(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

/** Roles que se pueden dar de alta como personal adicional (todos menos admin). */
export const ROLES_PERSONAL = ["gerente", "operador", "mesero"] as const;
export type RolPersonal = (typeof ROLES_PERSONAL)[number];

/**
 * Una fila de "personal adicional" del wizard de alta. Mismas reglas que `admin`
 * (username como identificador principal, email opcional) más el rol a asignar.
 */
const personalSchema = z
  .object({
    rol: z.enum(ROLES_PERSONAL, { error: "Selecciona un rol" }),
    nombre: z.string().trim().min(1, "El nombre es obligatorio"),
    username: z.string().trim().min(3, "El usuario es obligatorio (mínimo 3 caracteres)"),
    email: z.string().trim().email("Correo inválido").or(z.literal("")).optional(),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
    password_confirmation: z.string(),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Las contraseñas no coinciden",
    path: ["password_confirmation"],
  });

export type PersonalInput = z.infer<typeof personalSchema>;

export const crearEstablecimientoSchema = establecimientoBase
  .extend({
    admin: adminSchema,
    /** Confirmación de contraseña (validación solo del cliente; no viaja al backend). */
    admin_password_confirmation: z.string(),
    /** Opcional: el resto del equipo, de una, sin pasar por "Usuarios" después. */
    personal: z.array(personalSchema).max(20, "Máximo 20 personas por alta"),
  })
  .refine((data) => data.admin.password === data.admin_password_confirmation, {
    message: "Las contraseñas no coinciden",
    path: ["admin_password_confirmation"],
  });

export const editarEstablecimientoSchema = establecimientoBase;

export type CrearEstablecimientoInput = z.infer<typeof crearEstablecimientoSchema>;
export type EditarEstablecimientoInput = z.infer<typeof editarEstablecimientoSchema>;

/** Rescate de acceso: se elige el admin a restablecer de una lista (su id). */
export const restablecerAccesoSchema = z.object({
  id_usuario: z
    .number({ error: "Selecciona un administrador" })
    .int()
    .positive("Selecciona un administrador"),
});

export type RestablecerAccesoInput = z.infer<typeof restablecerAccesoSchema>;
