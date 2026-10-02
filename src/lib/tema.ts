import { createContext, useContext, useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAuthStore } from "@/lib/auth";

/**
 * Modo visual del árbol actual, para las primitivas que se montan en un PORTAL.
 *
 * El tema no es una clase global: el POS lo enciende poniendo `data-mode="dark"` en su
 * contenedor raíz (`PosLayout`) y los tokens de `tokens.css` cuelgan de ese atributo. Radix
 * monta diálogos, selects y menús en un portal pegado a `document.body`, o sea **fuera** de
 * ese contenedor: la cascada les daba los tokens claros y salían en blanco sobre el POS
 * oscuro (Nueva orden, Cobrar, Descuento, el teclado de firma).
 *
 * Se propaga el modo por contexto y cada primitiva lo estampa en su propia raíz, que es donde
 * las variables se vuelven a resolver. La alternativa —portalear dentro del contenedor del POS
 * con `container`— ataría el apilamiento del modal al layout: bastaría un `transform` en
 * cualquier ancestro para que `position: fixed` dejara de referirse a la ventana.
 */
export type ModoTema = "dark" | undefined;

/** `undefined` = tema claro (el de administración), que es el de la raíz del documento. */
export const ContextoModoTema = createContext<ModoTema>(undefined);

/** Modo que deben estampar las primitivas portaladas en su atributo `data-mode`. */
export function useModoTema(): ModoTema {
  return useContext(ContextoModoTema);
}

/* ─────────────────────────── Preferencia de la administración ─────────────────────────── */

/**
 * Qué tema quiere el usuario en la ADMINISTRACIÓN.
 *
 * Solo la administración: el POS es oscuro **por diseño**, no por gusto. Es oscuro porque se
 * usa en un bar de noche, en una tablet y a un palmo de la cara del mesero; dejarlo a
 * preferencia invita a que alguien lo ponga en claro y empeore su propia operación. El tema del
 * POS es una decisión de producto, como que el ticket sea de 58 mm.
 *
 * El default es `claro` mientras el tema oscuro de administración no pase su revisión visual:
 * hasta entonces, quien no lo pida no se lo encuentra.
 */
export type PreferenciaTema = "claro" | "oscuro" | "sistema";

export const PREFERENCIA_POR_DEFECTO: PreferenciaTema = "claro";

/**
 * La preferencia se guarda **por usuario**, no por navegador.
 *
 * Una sola preferencia en `localStorage` sería del dispositivo, y este producto vive en
 * dispositivos compartidos: la terminal de un bar la usan varias personas, y el equipo de la
 * oficina lo abren el dueño y el gerente con cuentas distintas. Con una llave global, el gusto
 * del primero se le impone a todos los demás.
 *
 * La llave es el id del usuario y no el del establecimiento por dos razones: el frontend
 * **nunca conoce el tenant** (regla de oro #4: lo resuelve el backend, y `/auth/me` no lo
 * devuelve), y las cuentas son por persona dentro de un establecimiento, así que el usuario ya
 * implica el tenant y además distingue entre dos personas del mismo local, que es lo que uno
 * quiere. Si algún día una cuenta pudiera cruzar establecimientos, esta llave se queda corta.
 *
 * Sigue siendo local al navegador: es una preferencia de comodidad, no un dato del negocio. La
 * versión que viaja con la persona entre dispositivos exige guardarla en el backend.
 */
interface EstadoTema {
  /** id de usuario → preferencia. Sin sesión no hay entrada y manda el default. */
  porUsuario: Record<string, PreferenciaTema>;
  setPreferencia: (idUsuario: number | null, preferencia: PreferenciaTema) => void;
}

export const useTemaStore = create<EstadoTema>()(
  persist(
    (set) => ({
      porUsuario: {},

      setPreferencia: (idUsuario, preferencia) =>
        set((estado) =>
          idUsuario === null
            ? estado
            : { porUsuario: { ...estado.porUsuario, [idUsuario]: preferencia } },
        ),
    }),
    { name: "bar-pos-tema" },
  ),
);

/** La preferencia de quien tiene la sesión abierta. */
export function usePreferenciaTema(): PreferenciaTema {
  const idUsuario = useAuthStore((s) => s.usuario?.id);

  return useTemaStore((s) =>
    idUsuario === undefined ? PREFERENCIA_POR_DEFECTO : (s.porUsuario[idUsuario] ?? PREFERENCIA_POR_DEFECTO),
  );
}

/** Fija la preferencia de quien tiene la sesión abierta. */
export function useFijarPreferenciaTema(): (preferencia: PreferenciaTema) => void {
  const idUsuario = useAuthStore((s) => s.usuario?.id);
  const fijar = useTemaStore((s) => s.setPreferencia);

  return (preferencia) => fijar(idUsuario ?? null, preferencia);
}

const CONSULTA_OSCURO = "(prefers-color-scheme: dark)";

function suscribirAlSistema(avisar: () => void): () => void {
  const consulta = window.matchMedia?.(CONSULTA_OSCURO);
  if (!consulta) return () => {};

  consulta.addEventListener("change", avisar);
  return () => consulta.removeEventListener("change", avisar);
}

function leerDelSistema(): boolean {
  return window.matchMedia?.(CONSULTA_OSCURO).matches ?? false;
}

/**
 * ¿El sistema operativo pide oscuro? Vía `useSyncExternalStore` para que la pantalla reaccione
 * si el usuario cambia el tema del sistema con la app abierta, sin recargar.
 */
export function usePrefiereOscuroElSistema(): boolean {
  return useSyncExternalStore(suscribirAlSistema, leerDelSistema, () => false);
}

/**
 * Modo resuelto para la administración: la preferencia, con `sistema` ya traducido.
 *
 * Devuelve el mismo tipo que consumen las primitivas portaladas, así que el valor sirve tal
 * cual para el atributo `data-mode` y para el contexto.
 */
export function useModoAdministracion(): ModoTema {
  const preferencia = usePreferenciaTema();
  const oscuroDelSistema = usePrefiereOscuroElSistema();

  if (preferencia === "oscuro") return "dark";
  if (preferencia === "claro") return undefined;

  return oscuroDelSistema ? "dark" : undefined;
}
