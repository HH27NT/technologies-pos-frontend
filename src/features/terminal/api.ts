import { useMutation, useQuery } from "@tanstack/react-query";
import { client } from "@/lib/api/client";
import { qk } from "@/lib/api/queryKeys";
import { useTerminalStore } from "./store";
import type { MeseroIdentificado, ModoTerminal } from "./types";

/**
 * Hooks de la terminal compartida. `GET /terminal/modo` no exige permiso alguno
 * (solo sesión): la pregunta "¿este local pide PIN?" la hace todo el mundo, desde
 * el POS del mesero hasta la pantalla de Usuarios del gerente, y ninguno de los dos
 * puede leer la configuración completa del establecimiento.
 */

/** GET /terminal/modo — si el establecimiento opera con terminal compartida. */
export function useModoTerminal() {
  return useQuery({
    queryKey: qk.terminal.modo,
    queryFn: () => client.get<ModoTerminal>("/terminal/modo"),
    // El modo lo cambia un admin muy de vez en cuando, nunca a media jornada.
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * POST /terminal/identificar — resuelve quién está tecleando y emite su token de firma.
 *
 * **No es un login:** no cambia la sesión ni concede permisos; la tablet sigue siendo la
 * misma cuenta. `guardar: false` sirve al cobro, donde se pide el PIN de nuevo solo para
 * firmar ese pago y no tiene por qué desbloquear la terminal para otra persona.
 *
 * Sin `onError`: el 422 ("PIN inválido.") se muestra donde se tecleó, no en un toast que
 * tape el teclado.
 */
export function useIdentificarMesero({ guardar = true }: { guardar?: boolean } = {}) {
  const identificar = useTerminalStore((s) => s.identificar);
  return useMutation({
    mutationFn: (pin: string) =>
      client.post<MeseroIdentificado>("/terminal/identificar", { pin }),
    onSuccess: (datos) => {
      if (guardar) identificar(datos);
    },
  });
}
