import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client } from "@/lib/api/client";
import { qk } from "@/lib/api/queryKeys";
import type { ApiError } from "@/lib/api/types";
import type { GrupoPermisos, RolRecurso } from "./types";

/**
 * Hooks de datos de Roles (M04 · editor de roles a medida). Errores del backend
 * mostrados tal cual (regla #2). Nunca se envía `id_establecimiento` (regla #4).
 */

/** GET /roles — roles del establecimiento (presets + a medida). Alimenta el selector. */
export function useRoles() {
  return useQuery({
    queryKey: qk.roles.all,
    queryFn: () => client.get<RolRecurso[]>("/roles"),
    staleTime: 5 * 60_000,
  });
}

/**
 * GET /roles/permisos — catálogo de permisos otorgables, agrupado por módulo.
 *
 * El texto (etiqueta y descripción) lo manda el backend: así un permiso nuevo aparece
 * en el editor sin tener que desplegar el frontend. Exige `roles.gestionar`, de ahí el
 * `enabled` — no tiene sentido pedirlo si el editor no se va a abrir.
 */
export function usePermisosCatalogo(enabled = true) {
  return useQuery({
    queryKey: [...qk.roles.all, "permisos"] as const,
    queryFn: () => client.get<GrupoPermisos[]>("/roles/permisos"),
    staleTime: 30 * 60_000,
    enabled,
  });
}

/** Payload del formulario de rol. Sin `id` crea; con `id` edita. */
export interface GuardarRolPayload {
  id?: number;
  etiqueta: string;
  descripcion?: string;
  permisos: string[];
  /** Rol de origen al clonar (solo en alta). El backend registra la copia. */
  clonar_de?: number;
}

/** POST /roles (crear o clonar) · PUT /roles/{id} (editar). */
export function useGuardarRol() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: GuardarRolPayload) => {
      const payload: Record<string, unknown> = {
        etiqueta: input.etiqueta.trim(),
        permisos: input.permisos,
      };
      if (input.descripcion?.trim()) payload.descripcion = input.descripcion.trim();
      if (!id && input.clonar_de) payload.clonar_de = input.clonar_de;

      return id
        ? client.put<RolRecurso>(`/roles/${id}`, payload)
        : client.post<RolRecurso>("/roles", payload);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.roles.all });
      // Un cambio de permisos altera lo que el personal puede hacer: la lista de
      // usuarios muestra el rol, así que también se refresca.
      qc.invalidateQueries({ queryKey: qk.usuarios.all });
      toast.success(variables.id ? "Rol actualizado" : "Rol creado");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

/** DELETE /roles/{id}. El backend responde 409 si el rol tiene usuarios asignados. */
export function useEliminarRol() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => client.delete<null>(`/roles/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.roles.all });
      toast.success("Rol eliminado");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}
