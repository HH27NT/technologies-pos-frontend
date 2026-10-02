import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Estado global de sesión (Zustand). Fuente de verdad de:
 *  - token          → Bearer para el cliente Axios (se persiste en localStorage).
 *  - usuario/permisos/esSuperAdmin → hidratados con GET /auth/me al arrancar.
 *  - cajaAbierta    → compuerta de caja (alimentada por GET /caja/actual).
 *
 * Solo el `token` se persiste; la sesión (usuario/permisos/caja) se rehidrata
 * siempre desde el backend para no confiar en datos de RBAC guardados en el cliente.
 */

/** Forma mínima del usuario que devuelve el backend (Resource de M01/M04). */
export interface Usuario {
  id: number;
  nombre: string;
  email?: string;
  login?: string;
  rol?: string;
}

export interface AuthState {
  token: string | null;
  usuario: Usuario | null;
  permisos: string[];
  esSuperAdmin: boolean;
  cajaAbierta: boolean;
  /** true una vez que /auth/me respondió (éxito o fallo), para no parpadear guards. */
  sesionCargada: boolean;

  setToken: (token: string) => void;
  setSesion: (data: {
    usuario: Usuario;
    permisos: string[];
    esSuperAdmin: boolean;
  }) => void;
  setCajaAbierta: (abierta: boolean) => void;
  setSesionCargada: (cargada: boolean) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      usuario: null,
      permisos: [],
      esSuperAdmin: false,
      cajaAbierta: false,
      sesionCargada: false,

      setToken: (token) => set({ token }),

      setSesion: ({ usuario, permisos, esSuperAdmin }) =>
        set({
          usuario,
          permisos,
          esSuperAdmin,
          sesionCargada: true,
        }),

      setCajaAbierta: (cajaAbierta) => set({ cajaAbierta }),

      setSesionCargada: (sesionCargada) => set({ sesionCargada }),

      clearSession: () =>
        set({
          token: null,
          usuario: null,
          permisos: [],
          esSuperAdmin: false,
          cajaAbierta: false,
          sesionCargada: true,
        }),
    }),
    {
      name: "bar-pos-auth",
      // Persistir solo el token; el resto se rehidrata desde /auth/me.
      partialize: (state) => ({ token: state.token }),
    },
  ),
);
