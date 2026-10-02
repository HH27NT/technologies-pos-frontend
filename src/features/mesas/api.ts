import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client } from "@/lib/api/client";
import { qk } from "@/lib/api/queryKeys";
import type { ApiError, Paginated } from "@/lib/api/types";
import type { MesaRecurso } from "./types";

/**
 * Hooks de datos de Mesas (M09). Lecturas paginadas + mutaciones con
 * invalidación de query keys. Errores del backend mostrados tal cual (regla #2).
 * Nunca se envía `id_establecimiento` (regla #4).
 */

/** GET /mesas — lista paginada. `params` lleva page/filtros. */
export function useMesas(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: qk.mesas.list(params),
    queryFn: () => client.get<Paginated<MesaRecurso>>("/mesas", { params }),
  });
}

/** Payload que envía el formulario (sin id para crear; con id para editar). */
export interface GuardarMesaPayload {
  id?: number;
  numero: number;
  nombre?: string;
  zona?: string;
  capacidad?: number;
}

/** POST /mesas (crear) o PUT /mesas/{id} (editar). */
export function useGuardarMesa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: GuardarMesaPayload) => {
      const payload: Record<string, unknown> = { numero: input.numero };
      if (input.nombre?.trim()) payload.nombre = input.nombre.trim();
      if (input.zona?.trim()) payload.zona = input.zona.trim();
      if (input.capacidad != null) {
        payload.capacidad = input.capacidad;
      }
      return id
        ? client.put<MesaRecurso>(`/mesas/${id}`, payload)
        : client.post<MesaRecurso>("/mesas", payload);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.mesas.all });
      toast.success(variables.id ? "Mesa actualizada" : "Mesa creada");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

/** PATCH /mesas/{id}/activar — alterna activa/inactiva. */
export function useActivarMesa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => client.patch<MesaRecurso>(`/mesas/${id}/activar`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.mesas.all });
      toast.success("Estado actualizado");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}
