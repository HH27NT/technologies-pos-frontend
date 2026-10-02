import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client } from "@/lib/api/client";
import { qk } from "@/lib/api/queryKeys";
import type { ApiError, Paginated } from "@/lib/api/types";
import type { ProveedorRecurso } from "./types";

/**
 * Hooks de datos de Proveedores (M08). Lecturas paginadas + mutaciones con
 * invalidación de query keys. Errores del backend mostrados tal cual (regla #2).
 * Nunca se envía `id_establecimiento` (regla #4).
 */

/** GET /proveedores — lista paginada. `params` lleva page/filtros. */
export function useProveedores(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: qk.proveedores.list(params),
    queryFn: () => client.get<Paginated<ProveedorRecurso>>("/proveedores", { params }),
  });
}

/** Payload que envía el formulario (sin id para crear; con id para editar). */
export interface GuardarProveedorPayload {
  id?: number;
  nombre: string;
  telefono?: string;
  email?: string;
}

/** POST /proveedores (crear) o PUT /proveedores/{id} (editar). */
export function useGuardarProveedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: GuardarProveedorPayload) => {
      const payload: Record<string, unknown> = { nombre: input.nombre };
      if (input.telefono?.trim()) payload.telefono = input.telefono.trim();
      if (input.email?.trim()) payload.email = input.email.trim();
      return id
        ? client.put<ProveedorRecurso>(`/proveedores/${id}`, payload)
        : client.post<ProveedorRecurso>("/proveedores", payload);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.proveedores.all });
      toast.success(variables.id ? "Proveedor actualizado" : "Proveedor creado");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

/** PATCH /proveedores/{id}/activar — alterna activo/inactivo. */
export function useActivarProveedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => client.patch<ProveedorRecurso>(`/proveedores/${id}/activar`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.proveedores.all });
      toast.success("Estado actualizado");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}
