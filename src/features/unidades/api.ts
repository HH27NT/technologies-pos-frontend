import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client } from "@/lib/api/client";
import { qk } from "@/lib/api/queryKeys";
import type { ApiError, Paginated } from "@/lib/api/types";
import type { UnidadRecurso } from "./types";

/**
 * Hooks de datos de Unidades de medida (M08). A diferencia de otros recursos,
 * se **borran** (DELETE) en vez de activar/desactivar. Las globales son de solo
 * lectura. Errores del backend mostrados tal cual (regla #2).
 */

/** GET /unidades-medida — lista paginada. */
export function useUnidades(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: qk.unidadesMedida.list(params),
    queryFn: () => client.get<Paginated<UnidadRecurso>>("/unidades-medida", { params }),
  });
}

/** Payload que envía el formulario (sin id para crear; con id para editar). */
export interface GuardarUnidadPayload {
  id?: number;
  nombre: string;
  abreviacion?: string;
}

/** POST /unidades-medida (crear) o PUT /unidades-medida/{id} (editar). */
export function useGuardarUnidad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: GuardarUnidadPayload) => {
      const payload: Record<string, unknown> = { nombre: input.nombre };
      if (input.abreviacion?.trim()) payload.abreviacion = input.abreviacion.trim();
      return id
        ? client.put<UnidadRecurso>(`/unidades-medida/${id}`, payload)
        : client.post<UnidadRecurso>("/unidades-medida", payload);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.unidadesMedida.all });
      toast.success(variables.id ? "Unidad actualizada" : "Unidad creada");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

/** DELETE /unidades-medida/{id} — elimina una unidad (no global). */
export function useEliminarUnidad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => client.delete<null>(`/unidades-medida/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.unidadesMedida.all });
      toast.success("Unidad eliminada");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}
