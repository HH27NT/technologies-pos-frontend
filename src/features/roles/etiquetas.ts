/**
 * Utilidades de presentación de roles (M04). El backend maneja los roles por su
 * `name` en minúsculas (admin, gerente, operador, mesero, super_admin); la UI los
 * muestra con etiqueta en español, sentence case.
 *
 * Los roles A MEDIDA traen su propia `etiqueta` desde el backend, así que no se
 * traducen: se muestran tal como los nombró el dueño del negocio.
 */
import type { RolRecurso } from "./types";

const ETIQUETAS: Record<string, string> = {
  super_admin: "Super administrador",
  admin: "Administrador",
  gerente: "Gerente",
  operador: "Operador",
  mesero: "Mesero",
};

/** Etiqueta legible para un nombre de rol; si es desconocido, devuelve el nombre tal cual. */
export function etiquetaRol(name: string): string {
  return ETIQUETAS[name] ?? name;
}

/**
 * Nombre a mostrar de un rol: su etiqueta propia (roles a medida) o la traducción
 * del preset. Es la función que deben usar las pantallas; `etiquetaRol` queda para
 * cuando solo se tiene el nombre suelto.
 */
export function nombreDeRol(rol: Pick<RolRecurso, "name" | "etiqueta">): string {
  return rol.etiqueta ?? etiquetaRol(rol.name);
}

/** Roles que solo un actor con `usuarios.gestionar_admins` puede asignar/gestionar. */
const ROLES_ADMIN = new Set(["admin", "super_admin"]);

/** ¿Este nombre de rol corresponde a un administrador? (para la salvaguarda anti-escalada). */
export function esRolAdmin(name: string): boolean {
  return ROLES_ADMIN.has(name);
}
