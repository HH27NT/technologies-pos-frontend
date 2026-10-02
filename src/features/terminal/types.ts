/**
 * Tipos de la terminal compartida (PIN de mesero). Forma verificada contra
 * `MeseroPinController::modo` e `identificar`.
 */

/** Estado del modo en este establecimiento (GET /terminal/modo). */
export interface ModoTerminal {
  /** Si el POS debe pedir PIN para atribuir la venta a una persona. */
  terminal_compartida: boolean;
  /** Segundos de inactividad tras los que la terminal se bloquea sola. */
  bloqueo_segundos: number;
}

/**
 * Mesero identificado en la terminal (POST /terminal/identificar).
 *
 * `token` es opaco y es lo ÚNICO que el backend acepta como firma de la venta:
 * `id_mesero` no viaja nunca desde el cliente (si viajara, cualquiera podría
 * atribuirse ventas ajenas editando la petición).
 */
export interface MeseroIdentificado {
  id: number;
  nombre: string;
  token: string;
  bloqueo_segundos: number;
}
