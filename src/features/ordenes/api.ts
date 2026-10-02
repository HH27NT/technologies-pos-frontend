import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client } from "@/lib/api/client";
import { qk } from "@/lib/api/queryKeys";
import type { ApiError, Paginated } from "@/lib/api/types";
import { notificarError, type AutorizacionOverride } from "@/features/autorizaciones";
import { tokenMeseroVigente } from "@/features/terminal/store";
import type { ItemOrden, Orden, SaldoOrden } from "./types";

/**
 * Hooks de datos de Órdenes (M11, POS núcleo). Errores del backend mostrados tal
 * cual (regla #2). Nunca se envía `id_establecimiento` (regla #4). Las escrituras
 * del ciclo de venta (crear/ítems/comanda/descuento) exigen caja abierta en el
 * backend (regla #5); la UI deshabilita esas acciones sin caja. Cancelar ítem y
 * anular NO pasan por la compuerta de caja (acción de admin).
 */

/** GET /ordenes — lista paginada (sin `detalles`). */
export function useOrdenes(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: qk.ordenes.list(params),
    queryFn: () => client.get<Paginated<Orden>>("/ordenes", { params }),
  });
}

/** GET /ordenes/{id} — detalle con `detalles[]`. */
export function useOrden(id: number | undefined) {
  return useQuery({
    queryKey: qk.ordenes.detail(id ?? 0),
    queryFn: () => client.get<Orden>(`/ordenes/${id}`),
    enabled: id != null,
  });
}

/** GET /ordenes/{id}/saldo — total/pagado/saldo/pagada. */
export function useSaldoOrden(id: number | undefined) {
  return useQuery({
    queryKey: qk.ordenes.saldo(id ?? 0),
    queryFn: () => client.get<SaldoOrden>(`/ordenes/${id}/saldo`),
    enabled: id != null,
  });
}

/** Refresca cachés tras una escritura que devuelve la orden completa. */
function useSyncOrden() {
  const qc = useQueryClient();
  return (orden: Orden) => {
    qc.setQueryData(qk.ordenes.detail(orden.id), orden);
    qc.invalidateQueries({ queryKey: ["ordenes", "list"] });
    qc.invalidateQueries({ queryKey: qk.ordenes.saldo(orden.id) });
  };
}

/** POST /ordenes — crea una orden (caja ✔, `ordenes.crear`). */
export function useCrearOrden() {
  const sync = useSyncOrden();
  return useMutation({
    mutationFn: (input: { id_tipo_orden: number; id_mesa?: number }) => {
      const payload: Record<string, unknown> = { id_tipo_orden: input.id_tipo_orden };
      if (input.id_mesa) payload.id_mesa = input.id_mesa;
      // Firma del mesero en terminal compartida. Viaja como token opaco y NUNCA como
      // `id_mesero`: un id en el cuerpo lo podría cambiar cualquiera desde el navegador
      // y el reporte por mesero dejaría de significar nada. Si no hay token (modo
      // apagado o sesión caducada), la orden se crea sin firma, que es el
      // comportamiento del backend.
      const token = tokenMeseroVigente();
      if (token) payload.mesero_token = token;
      return client.post<Orden>("/ordenes", payload);
    },
    onSuccess: (orden) => {
      sync(orden);
      toast.success(`Orden ${orden.folio} creada`);
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

/** POST /ordenes/{id}/items — agrega un ítem (caja ✔, `ordenes.agregar_item`). */
export function useAgregarItem() {
  const sync = useSyncOrden();
  return useMutation({
    mutationFn: ({
      idOrden,
      id_producto,
      cantidad,
    }: {
      idOrden: number;
      id_producto: number;
      cantidad: number;
    }) => client.post<Orden>(`/ordenes/${idOrden}/items`, { id_producto, cantidad }),
    onSuccess: (orden) => sync(orden),
    onError: (e: ApiError) => toast.error(e.message),
  });
}

/** PUT /ordenes/{id}/items/{itemId} — cambia la cantidad (caja ✔, `ordenes.agregar_item`). */
export function useEditarItem() {
  const sync = useSyncOrden();
  return useMutation({
    mutationFn: ({
      idOrden,
      idItem,
      cantidad,
    }: {
      idOrden: number;
      idItem: number;
      cantidad: number;
    }) => client.put<Orden>(`/ordenes/${idOrden}/items/${idItem}`, { cantidad }),
    onSuccess: (orden) => sync(orden),
    onError: (e: ApiError) => toast.error(e.message),
  });
}

/** POST /ordenes/{id}/comanda — envía a cocina/barra (caja ✔, `ordenes.agregar_item`). */
export function useEnviarComanda() {
  const sync = useSyncOrden();
  return useMutation({
    mutationFn: (idOrden: number) => client.post<Orden>(`/ordenes/${idOrden}/comanda`),
    onSuccess: (orden) => {
      sync(orden);
      toast.success("Comanda enviada");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

/** POST /ordenes/{id}/descuento — aplica descuento en monto (caja ✔, `ordenes.aplicar_descuento`). */
export function useAplicarDescuento() {
  const sync = useSyncOrden();
  return useMutation({
    mutationFn: ({ idOrden, descuento }: { idOrden: number; descuento: number }) =>
      client.post<Orden>(`/ordenes/${idOrden}/descuento`, { descuento }),
    onSuccess: (orden) => {
      sync(orden);
      toast.success("Descuento aplicado");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

/**
 * PATCH /ordenes/{id}/items/{itemId}/cancelar — cancela un ítem (SIN caja,
 * `ordenes.cancelar_item`; el operador lo solicita por autorización). Devuelve el
 * ítem, no la orden: se invalida el detalle para recomputar totales.
 */
export function useCancelarItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      idOrden,
      idItem,
      autorizacion,
    }: {
      idOrden: number;
      idItem: number;
      /** Override: si el operador no tiene `ordenes.cancelar_item`, adjunta el PIN de un admin. */
      autorizacion?: AutorizacionOverride;
    }) =>
      client.patch<ItemOrden>(
        `/ordenes/${idOrden}/items/${idItem}/cancelar`,
        autorizacion,
      ),
    onSuccess: (_item, { idOrden }) => {
      qc.invalidateQueries({ queryKey: qk.ordenes.detail(idOrden) });
      qc.invalidateQueries({ queryKey: ["ordenes", "list"] });
      qc.invalidateQueries({ queryKey: qk.ordenes.saldo(idOrden) });
      toast.success("Ítem cancelado");
    },
    onError: (e: ApiError, { autorizacion }) => notificarError(e, autorizacion),
  });
}

/**
 * PATCH /ordenes/{id}/reasignar — cambia el mesero atribuido a la orden (traspaso, SIN
 * caja, `ordenes.reasignar`; admin/gerente). Solo aplica a órdenes abiertas.
 */
export function useReasignarOrden() {
  const sync = useSyncOrden();
  return useMutation({
    mutationFn: ({ idOrden, idUsuario }: { idOrden: number; idUsuario: number }) =>
      client.patch<Orden>(`/ordenes/${idOrden}/reasignar`, { id_usuario: idUsuario }),
    onSuccess: (orden) => {
      sync(orden);
      toast.success("Orden reasignada");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

/** PATCH /ordenes/{id}/anular — anula la orden (SIN caja, `ordenes.anular`). */
export function useAnularOrden() {
  const sync = useSyncOrden();
  return useMutation({
    mutationFn: ({
      idOrden,
      autorizacion,
    }: {
      idOrden: number;
      /** Override: si el operador no tiene `ordenes.anular`, adjunta el PIN de un admin. */
      autorizacion?: AutorizacionOverride;
    }) => client.patch<Orden>(`/ordenes/${idOrden}/anular`, autorizacion),
    onSuccess: (orden) => {
      sync(orden);
      toast.success(`Orden ${orden.folio} anulada`);
    },
    onError: (e: ApiError, { autorizacion }) => notificarError(e, autorizacion),
  });
}
