import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client } from "@/lib/api/client";
import { qk } from "@/lib/api/queryKeys";
import type { ApiError } from "@/lib/api/types";
import type { RegistrarPagoResponse } from "./types";

/**
 * Hooks de datos de Pagos (M12). Registrar un pago exige caja abierta en el
 * backend (regla #5) y `ordenes.cobrar`; la UI deshabilita "Cobrar" sin caja o
 * sin permiso. Errores del backend mostrados tal cual (regla #2). El saldo y el
 * cambio los calcula el backend (regla #6): solo se muestran. Nunca se envía
 * `id_establecimiento` (regla #4).
 */

export interface RegistrarPagoPayload {
  idOrden: number;
  id_tipo_pago: number;
  monto: number;
  referencia?: string;
  /**
   * Firma del mesero (terminal compartida). Es un token recién emitido al teclear el
   * PIN en el propio cobro: aquí NO se reutiliza el de la sesión de la terminal,
   * porque en el cobro se firma dinero y quien cobra debe estamparlo en ese momento.
   */
  mesero_token?: string;
}

/** POST /ordenes/{id}/pagos — registra un pago (simple o una parte del dividido). */
export function useRegistrarPago() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      idOrden,
      id_tipo_pago,
      monto,
      referencia,
      mesero_token,
    }: RegistrarPagoPayload) => {
      const payload: Record<string, unknown> = { id_tipo_pago, monto };
      if (referencia?.trim()) payload.referencia = referencia.trim();
      if (mesero_token) payload.mesero_token = mesero_token;
      return client.post<RegistrarPagoResponse>(`/ordenes/${idOrden}/pagos`, payload);
    },
    onSuccess: (_res, { idOrden }) => {
      // El pago mueve saldo, totales y estado de la orden: refresca detalle,
      // saldo y la lista de órdenes del turno.
      qc.invalidateQueries({ queryKey: qk.ordenes.detail(idOrden) });
      qc.invalidateQueries({ queryKey: qk.ordenes.saldo(idOrden) });
      qc.invalidateQueries({ queryKey: ["ordenes", "list"] });
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}
