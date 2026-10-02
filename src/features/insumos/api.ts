import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client } from "@/lib/api/client";
import { qk } from "@/lib/api/queryKeys";
import type { ApiError, Paginated } from "@/lib/api/types";
import { notificarError, type AutorizacionOverride } from "@/features/autorizaciones";
import type { InsumoRecurso, MovimientoRecurso, TipoInsumo, TipoMovimiento } from "./types";

/**
 * Hooks de datos de Insumos + movimientos/kardex (M08). Lecturas paginadas +
 * mutaciones con invalidación. Errores del backend mostrados tal cual (regla #2).
 * Nunca se envía `id_establecimiento` (regla #4). El stock lo calcula el backend
 * (regla #6): aquí solo se muestra.
 */

/** GET /insumos — lista paginada. `opciones.enabled` permite diferir la carga. */
export function useInsumos(
  params?: Record<string, unknown>,
  opciones?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: qk.insumos.list(params),
    queryFn: () => client.get<Paginated<InsumoRecurso>>("/insumos", { params }),
    enabled: opciones?.enabled,
  });
}

/** GET /insumos/{id}/kardex — movimientos del insumo (paginado). */
export function useKardex(id: number | undefined, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: qk.insumos.kardex(id ?? 0),
    queryFn: () =>
      client.get<Paginated<MovimientoRecurso>>(`/insumos/${id}/kardex`, { params }),
    enabled: id != null,
  });
}

/** Payload que envía el formulario de insumo (sin id para crear; con id para editar). */
export interface GuardarInsumoPayload {
  id?: number;
  nombre: string;
  id_unidad_medida: number;
  tipo: TipoInsumo;
  stock_minimo?: number;
  costo_unitario?: number;
  id_proveedor?: number;
  /** Solo al crear: el backend lo traduce a una entrada real (ver GuardarInsumoService). */
  stock_inicial?: number;
}

/** POST /insumos (crear) o PUT /insumos/{id} (editar). */
export function useGuardarInsumo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: GuardarInsumoPayload) => {
      const payload: Record<string, unknown> = {
        nombre: input.nombre,
        id_unidad_medida: input.id_unidad_medida,
        tipo: input.tipo,
      };
      if (input.stock_minimo != null) payload.stock_minimo = input.stock_minimo;
      if (input.costo_unitario != null) payload.costo_unitario = input.costo_unitario;
      if (input.id_proveedor != null) payload.id_proveedor = input.id_proveedor;
      // El backend rechaza `stock_inicial` en edición (422): solo va en el alta.
      if (!id && input.stock_inicial != null) payload.stock_inicial = input.stock_inicial;
      return id
        ? client.put<InsumoRecurso>(`/insumos/${id}`, payload)
        : client.post<InsumoRecurso>("/insumos", payload);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.insumos.all });
      toast.success(variables.id ? "Insumo actualizado" : "Insumo creado");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

/** PATCH /insumos/{id}/activar — alterna activo/inactivo. */
export function useActivarInsumo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => client.patch<InsumoRecurso>(`/insumos/${id}/activar`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.insumos.all });
      toast.success("Estado actualizado");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

/** Payload de un movimiento de inventario. */
export interface RegistrarMovimientoPayload {
  id_insumo: number;
  tipo: TipoMovimiento;
  cantidad: number;
  motivo?: string;
  costo_unitario?: number;
  /** Override: si el operador no tiene `inventario.<tipo>`, adjunta el PIN de un admin. */
  autorizacion?: AutorizacionOverride;
}

/**
 * POST /movimientos — registra un movimiento (entrada/ajuste/merma). El backend
 * exige el permiso `inventario.<tipo>` correspondiente; si el operador no lo tiene,
 * puede adjuntar el bloque de override (PIN de un admin, plano en el body) y el
 * backend lo ejecuta y registra. Invalida insumos (cambia el stock) y el kardex.
 */
export function useRegistrarMovimiento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RegistrarMovimientoPayload) => {
      const payload: Record<string, unknown> = {
        id_insumo: input.id_insumo,
        tipo: input.tipo,
        cantidad: input.cantidad,
      };
      if (input.motivo?.trim()) payload.motivo = input.motivo.trim();
      if (input.costo_unitario != null) payload.costo_unitario = input.costo_unitario;
      if (input.autorizacion) Object.assign(payload, input.autorizacion);
      return client.post<MovimientoRecurso>("/movimientos", payload);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.insumos.all });
      qc.invalidateQueries({ queryKey: qk.insumos.kardex(variables.id_insumo) });
      toast.success("Movimiento registrado");
    },
    onError: (e: ApiError, { autorizacion }) => notificarError(e, autorizacion),
  });
}
