import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client } from "@/lib/api/client";
import { qk } from "@/lib/api/queryKeys";
import type { ApiError } from "@/lib/api/types";
import type { ConfiguracionRecurso } from "./types";

/**
 * Hooks de datos de Configuración (M03). Singleton por establecimiento, gateado
 * por `configuracion.editar`. Errores del backend mostrados tal cual (regla #2).
 * Nunca se envía `id_establecimiento` (tenant implícito, regla #4).
 */

/** GET /configuracion — configuración del establecimiento actual. */
export function useConfiguracion() {
  return useQuery({
    queryKey: qk.configuracion.all,
    queryFn: () => client.get<ConfiguracionRecurso>("/configuracion"),
  });
}

/** Payload del PUT: solo los campos editables (parcial admitido por el backend). */
export interface GuardarConfiguracionPayload {
  nombre_comercial: string | null;
  telefono_ticket: string | null;
  direccion_ticket: string | null;
  impresion_automatica: boolean;
  terminal_compartida: boolean;
  bloqueo_terminal_segundos: number;
  stock_minimo_global: number | null;
  aplica_impuesto: boolean;
  tasa_impuesto: number | null;
}

/** PUT /configuracion — actualiza la configuración. */
export function useGuardarConfiguracion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: GuardarConfiguracionPayload) =>
      client.put<ConfiguracionRecurso>("/configuracion", payload),
    onSuccess: (data) => {
      qc.setQueryData(qk.configuracion.all, data);
      qc.invalidateQueries({ queryKey: qk.configuracion.all });
      toast.success("Configuración actualizada");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}
