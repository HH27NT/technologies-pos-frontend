import { useEffect } from "react";
import { useTerminalStore } from "./store";

/**
 * Bloquea la terminal cuando caduca el token del mesero activo.
 *
 * La vigencia la fija el backend al emitir el token y no se puede extender desde el
 * cliente, así que el temporizador apunta al vencimiento y la actividad NO lo renueva
 * (ver `store.ts`). Además de un `setTimeout`, se comprueba el reloj al volver a la
 * pestaña: en segundo plano el navegador estrangula los timers, y sin esa comprobación
 * la terminal podría seguir abierta con un token ya muerto.
 */
export function useAutoBloqueo() {
  const expiraEn = useTerminalStore((s) => s.expiraEn);
  const bloquear = useTerminalStore((s) => s.bloquear);

  useEffect(() => {
    if (expiraEn == null) return;

    const restante = expiraEn - Date.now();
    if (restante <= 0) {
      bloquear();
      return;
    }

    const id = setTimeout(bloquear, restante);
    const alVolver = () => {
      if (Date.now() >= expiraEn) bloquear();
    };
    document.addEventListener("visibilitychange", alVolver);

    return () => {
      clearTimeout(id);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [expiraEn, bloquear]);
}
