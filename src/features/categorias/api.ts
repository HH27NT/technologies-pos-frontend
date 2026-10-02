import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client } from "@/lib/api/client";
import { qk } from "@/lib/api/queryKeys";
import type { ApiError, Paginated } from "@/lib/api/types";
import type { CategoriaRecurso } from "./types";

/**
 * Hooks de datos de Categorías (M05). Lecturas paginadas + mutaciones con
 * invalidación de query keys. Errores del backend mostrados tal cual (regla #2).
 * Nunca se envía `id_establecimiento` (regla #4).
 */

/** GET /categorias — lista paginada. `params` lleva page/filtros. */
export function useCategorias(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: qk.categorias.list(params),
    queryFn: () => client.get<Paginated<CategoriaRecurso>>("/categorias", { params }),
  });
}

/** Payload que envía el formulario (sin id para crear; con id para editar). */
export interface GuardarCategoriaPayload {
  id?: number;
  nombre: string;
  orden_display?: number;
}

/** POST /categorias (crear) o PUT /categorias/{id} (editar). */
export function useGuardarCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: GuardarCategoriaPayload) => {
      const payload: Record<string, unknown> = { nombre: input.nombre };
      if (input.orden_display != null) {
        payload.orden_display = input.orden_display;
      }
      return id
        ? client.put<CategoriaRecurso>(`/categorias/${id}`, payload)
        : client.post<CategoriaRecurso>("/categorias", payload);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.categorias.all });
      toast.success(variables.id ? "Categoría actualizada" : "Categoría creada");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

/**
 * Reordena la lista: recibe las categorías **en el orden deseado** y las renumera
 * 1..n, escribiendo solo las que cambian de posición.
 *
 * Renumerar (en vez de intercambiar dos valores) es deliberado: la columna admite
 * nulos y duplicados de antes, y así cada movimiento deja la lista normalizada en
 * vez de arrastrar los huecos. El backend no tiene endpoint de reordenamiento
 * masivo (M05 solo expone PUT por id), así que son N PUT secuenciales; con el
 * puñado de categorías que tiene un bar es barato, y `onSettled` reconsulta la
 * verdad aunque uno falle a media tanda.
 *
 * El orden se aplica **dentro de la página visible**: mover una categoría de una
 * página a otra no se puede desde aquí.
 */
export function useReordenarCategorias(params?: Record<string, unknown>) {
  const qc = useQueryClient();
  const key = qk.categorias.list(params);

  return useMutation({
    mutationFn: async (orden: CategoriaRecurso[]) => {
      const cambios = orden
        .map((categoria, i) => ({ categoria, posicion: i + 1 }))
        .filter(({ categoria, posicion }) => categoria.orden_display !== posicion);

      for (const { categoria, posicion } of cambios) {
        await client.put<CategoriaRecurso>(`/categorias/${categoria.id}`, {
          nombre: categoria.nombre,
          orden_display: posicion,
        });
      }
    },
    // Optimista: la flecha debe mover la fila al instante. Sin esto, cada
    // movimiento espera N PUT + refetch y el gesto se siente trabado.
    onMutate: async (orden) => {
      await qc.cancelQueries({ queryKey: key });
      const previo = qc.getQueryData<Paginated<CategoriaRecurso>>(key);
      qc.setQueryData<Paginated<CategoriaRecurso>>(key, (actual) =>
        actual
          ? {
              ...actual,
              data: orden.map((c, i) => ({ ...c, orden_display: i + 1 })),
            }
          : actual,
      );
      return { previo };
    },
    onError: (e: ApiError, _orden, ctx) => {
      if (ctx?.previo) qc.setQueryData(key, ctx.previo);
      toast.error(e.message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.categorias.all }),
  });
}

/** PATCH /categorias/{id}/activar — alterna activo/inactivo. */
export function useActivarCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => client.patch<CategoriaRecurso>(`/categorias/${id}/activar`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.categorias.all });
      toast.success("Estado actualizado");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}
