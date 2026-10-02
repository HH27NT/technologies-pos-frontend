import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client } from "@/lib/api/client";
import { qk } from "@/lib/api/queryKeys";
import { useAuthStore } from "@/lib/auth";
import type { ApiError, Paginated } from "@/lib/api/types";
import type { CajaSesion } from "./types";

/**
 * Hooks de datos de Caja (M10). La sesión de caja alimenta la compuerta del POS
 * (regla de oro #5): al abrir/cerrar se actualiza `cajaAbierta` en el authStore,
 * que habilita/deshabilita las escrituras del ciclo de venta.
 *
 * Errores del backend mostrados tal cual (regla #2). Nunca se envía
 * `id_establecimiento` (regla #4).
 */

/** GET /caja/actual — la sesión de caja abierta, o `null` si no hay ninguna. */
export function useCajaActual(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: qk.caja.actual,
    queryFn: () => client.get<CajaSesion | null>("/caja/actual"),
    refetchInterval: options?.refetchInterval,
  });
}

/**
 * Mantiene fresca la compuerta de caja (regla #5) mientras esté montado. Refresca al
 * re-enfocar la ventana (default de TanStack Query) y por intervalo, para que el POS
 * refleje que el cajero abrió/cerró caja en OTRA terminal SIN que el mesero recargue.
 * Antes `cajaAbierta` solo se resolvía en el login (bootstrapSession), dejando al mesero
 * con la caja "cerrada" si el cajero la abría después.
 */
export function useSincronizarCajaAbierta(): void {
  const query = useCajaActual({ refetchInterval: 30_000 });
  const setCajaAbierta = useAuthStore((s) => s.setCajaAbierta);

  useEffect(() => {
    if (query.isSuccess) {
      setCajaAbierta(query.data != null);
    }
  }, [query.isSuccess, query.data, setCajaAbierta]);
}

/** GET /caja/historico — sesiones de caja paginadas, más reciente primero. */
export function useHistoricoCaja(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: qk.caja.historico(params),
    queryFn: () => client.get<Paginated<CajaSesion>>("/caja/historico", { params }),
  });
}

/** POST /caja/abrir — abre la caja con el monto inicial en efectivo. */
export function useAbrirCaja() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { monto_inicial: number }) =>
      client.post<CajaSesion>("/caja/abrir", { monto_inicial: input.monto_inicial }),
    onSuccess: () => {
      useAuthStore.getState().setCajaAbierta(true);
      qc.invalidateQueries({ queryKey: qk.caja.actual });
      qc.invalidateQueries({ queryKey: ["caja", "historico"] });
      toast.success("Caja abierta");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

/** POST /caja/cerrar — cierra la caja con el efectivo contado y un motivo opcional. */
export function useCerrarCaja() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { monto_contado: number; motivo?: string }) => {
      const payload: Record<string, unknown> = { monto_contado: input.monto_contado };
      if (input.motivo?.trim()) payload.motivo = input.motivo.trim();
      return client.post<CajaSesion>("/caja/cerrar", payload);
    },
    onSuccess: () => {
      useAuthStore.getState().setCajaAbierta(false);
      qc.invalidateQueries({ queryKey: qk.caja.actual });
      qc.invalidateQueries({ queryKey: ["caja", "historico"] });
      toast.success("Caja cerrada");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}
