import { create } from "zustand";
import type { MeseroIdentificado } from "./types";

/**
 * Mesero identificado en la terminal compartida (sesión efímera).
 *
 * **No se persiste, a propósito.** Si el token sobreviviera a un refresco, sobreviviría
 * también a que la persona se aleje de la tablet — que es justo lo que el auto-bloqueo
 * evita. Vive en memoria y muere con la pestaña.
 *
 * La vigencia la manda el backend: el token caduca a los `bloqueo_segundos` de haberse
 * emitido y **no se puede extender desde el cliente**. Por eso la actividad no renueva
 * la sesión: si el front fingiera que sigue viva, seguiríamos mandando un token vencido
 * y las órdenes se crearían **sin firma y sin avisar** (el backend las acepta igual, por
 * diseño). La única forma de renovar es volver a teclear el PIN — cosa que el cobro hace
 * de todos modos.
 */

export interface MeseroActivo {
  id: number;
  nombre: string;
}

interface TerminalState {
  mesero: MeseroActivo | null;
  token: string | null;
  /** Momento (epoch ms) en que el token deja de valer. */
  expiraEn: number | null;

  /** Registra al mesero recién identificado y arranca su ventana de vigencia. */
  identificar: (datos: MeseroIdentificado) => void;
  /** Bloquea la terminal: olvida quién estaba y su token. */
  bloquear: () => void;
}

export const useTerminalStore = create<TerminalState>()((set) => ({
  mesero: null,
  token: null,
  expiraEn: null,

  identificar: ({ id, nombre, token, bloqueo_segundos }) =>
    set({
      mesero: { id, nombre },
      token,
      expiraEn: Date.now() + bloqueo_segundos * 1000,
    }),

  bloquear: () => set({ mesero: null, token: null, expiraEn: null }),
}));

/**
 * Token de firma vigente, o `undefined` si no hay mesero o ya caducó.
 *
 * Se comprueba la caducidad aquí y no solo con el temporizador porque una pestaña en
 * segundo plano puede tener el timer estrangulado por el navegador: sin esto, el primer
 * toque tras volver mandaría un token muerto.
 */
export function tokenMeseroVigente(): string | undefined {
  const { token, expiraEn } = useTerminalStore.getState();
  if (!token || !expiraEn || Date.now() >= expiraEn) return undefined;
  return token;
}
