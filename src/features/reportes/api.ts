import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { client } from "@/lib/api/client";
import { qk } from "@/lib/api/queryKeys";
import { useAuthStore } from "@/lib/auth";
import type { ApiError } from "@/lib/api/types";
import type { ExportacionResult, ReporteData } from "./types";

/**
 * Hooks de datos de Reportes (M16). Lecturas gateadas por `reportes.ver` (admin,
 * completo) o `reportes.ver_limitado` (operador). Todos comparten el envelope
 * uniforme. La exportación encola PDF/Excel y no bloquea la UI.
 */

/** GET /reportes/{tipo}?preset= — un reporte con su rango. */
export function useReporte(tipo: string, preset: string, enabled = true) {
  const params = { preset };
  return useQuery({
    queryKey: [...qk.reportes.all, tipo, params] as const,
    queryFn: () => client.get<ReporteData>(`/reportes/${tipo}`, { params }),
    enabled,
  });
}

export interface ExportarReportePayload {
  reporte: string;
  formato: string;
  preset: string;
}

/**
 * POST /reportes/exportar — encola la generación (PDF/Excel) y devuelve la URL de
 * descarga. La descarga se dispara aparte con `descargarExportacion` (blob + Bearer).
 */
export function useExportarReporte() {
  return useMutation({
    mutationFn: (payload: ExportarReportePayload) =>
      client.post<ExportacionResult>("/reportes/exportar", payload),
    onError: (e: ApiError) => toast.error(e.message),
  });
}

/**
 * Esperas entre intentos, en ms (el primero es inmediato). Suman ~10 s, que es el
 * presupuesto: el worker de la cola duerme hasta 3 s entre sondeos y dompdf tarda
 * ~0.5 s en un reporte chico, así que una espera corta no alcanza.
 */
const ESPERAS_DESCARGA_MS = [0, 300, 500, 800, 1200, 1500, 1500, 1500, 1500, 1500];

/**
 * Espera a que el archivo exportado exista y devuelve la respuesta con su contenido.
 *
 * `POST /reportes/exportar` responde **202 "se está generando"** y encola el trabajo, así
 * que la URL de descarga da **404 hasta que el worker escribe el archivo**. Antes se hacía
 * un solo reintento a los 900 ms: el Excel (~200 ms) lo alcanzaba a veces y el PDF (~540 ms
 * más lo que tarde el worker en despertar) fallaba casi siempre, aunque el archivo quedara
 * bien en el servidor.
 *
 * Los intentos NO descargan nada: un 404 no trae archivo, y el guardado ocurre una sola vez
 * más abajo, con el primer 200. Y solo se reintenta ante 404 —"todavía no"—: un 401 o un 500
 * no mejoran esperando, así que se falla de inmediato en vez de tardar 10 s en decirlo.
 */
async function esperarArchivo(url: string, headers: HeadersInit): Promise<Response> {
  for (const espera of ESPERAS_DESCARGA_MS) {
    if (espera > 0) await new Promise((r) => setTimeout(r, espera));

    const res = await fetch(url, { headers });
    if (res.ok) return res;
    if (res.status !== 404) break;
  }

  throw new Error("No se pudo descargar el archivo. Intenta de nuevo.");
}

/**
 * Descarga un archivo de exportación. La URL está protegida por Bearer (un GET
 * directo sin token falla), así que se baja como blob con el token del authStore y
 * se dispara la descarga en el navegador. La generación es asíncrona: se sondea hasta
 * que el archivo aparece (ver `esperarArchivo`). La pantalla mantiene "Generando…"
 * mientras tanto, así que la espera no queda muda.
 */
export async function descargarExportacion(
  url: string,
  nombreSugerido: string,
): Promise<void> {
  const token = useAuthStore.getState().token;
  const headers: HeadersInit = { Accept: "*/*" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await esperarArchivo(url, headers);

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = nombreSugerido;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
