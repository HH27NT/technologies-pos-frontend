import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client } from "@/lib/api/client";
import { qk } from "@/lib/api/queryKeys";
import type { ApiError, Paginated } from "@/lib/api/types";
import type { ImpresoraRecurso } from "./types";

/**
 * Hooks de datos de Impresoras (M13). CRUD de administración gateado por
 * `impresoras.gestionar`. Errores del backend mostrados tal cual (regla #2).
 * Nunca se envía `id_establecimiento` (regla #4).
 */

/** GET /impresoras — lista paginada. */
export function useImpresoras(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: qk.impresoras.list(params),
    queryFn: () => client.get<Paginated<ImpresoraRecurso>>("/impresoras", { params }),
  });
}

export interface GuardarImpresoraPayload {
  id?: number;
  nombre: string;
  tipo: string;
  conexion?: string;
}

/** POST /impresoras (crear) o PUT /impresoras/{id} (editar). */
export function useGuardarImpresora() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: GuardarImpresoraPayload) => {
      const payload: Record<string, unknown> = { nombre: input.nombre, tipo: input.tipo };
      if (input.conexion?.trim()) payload.conexion = input.conexion.trim();
      return id
        ? client.put<ImpresoraRecurso>(`/impresoras/${id}`, payload)
        : client.post<ImpresoraRecurso>("/impresoras", payload);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.impresoras.all });
      toast.success(variables.id ? "Impresora actualizada" : "Impresora creada");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

/** PATCH /impresoras/{id}/activar — alterna activa/inactiva. */
export function useActivarImpresora() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => client.patch<ImpresoraRecurso>(`/impresoras/${id}/activar`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.impresoras.all });
      toast.success("Estado actualizado");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}
