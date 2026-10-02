import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client } from "@/lib/api/client";
import { qk } from "@/lib/api/queryKeys";
import type { ApiError, Paginated } from "@/lib/api/types";
import type { ProductoConReceta, RecetaRecurso } from "./types";

/**
 * Hooks de datos de Recetas / BOM (M07). Lecturas paginadas + mutaciones con
 * invalidación. La receta de un producto se guarda **entera** (`PUT
 * /recetas/producto/{id}`); una lista vacía la borra. Errores del backend mostrados
 * tal cual (regla #2). Nunca se envía `id_establecimiento` (regla #4).
 */

/**
 * GET /recetas — lista paginada. `params` puede filtrar por producto
 * (`id_producto`). `opciones.enabled` difiere la carga: quien solo quiere saber si
 * un producto tiene receta no debe consultarla hasta que haga falta.
 */
export function useRecetas(
  params?: Record<string, unknown>,
  opciones?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: qk.recetas.list(params),
    queryFn: () => client.get<Paginated<RecetaRecurso>>("/recetas", { params }),
    enabled: opciones?.enabled,
  });
}

/**
 * GET /productos?con_recetas=1 — **la lista de la pantalla de Recetas**.
 *
 * La lista es de productos, no de renglones: un producto con cinco insumos es una
 * receta, no cinco filas. Antes se cruzaba `/recetas`, que pagina por renglón, así
 * que una receta larga se partía entre páginas y el producto de la siguiente parecía
 * no tener ninguna — un "sin receta" falso manda a capturar lo que ya existe.
 *
 * Acepta los filtros del índice de productos: `buscar`, `controla_inventario` y
 * `sin_receta` (los que faltan por recetear). Vive bajo la query key de productos
 * porque eso es lo que pide; las mutaciones de receta invalidan ambas.
 */
export function useProductosConReceta(
  params?: Record<string, unknown>,
  opciones?: { enabled?: boolean },
) {
  const query = { ...params, con_recetas: 1 };
  return useQuery({
    queryKey: qk.productos.list(query),
    queryFn: () => client.get<Paginated<ProductoConReceta>>("/productos", { params: query }),
    enabled: opciones?.enabled,
  });
}

/** Un renglón tal como lo manda el armador: insumo + cuánto consume. */
export interface RenglonReceta {
  id_insumo: number;
  cantidad: number;
}

/**
 * PUT /recetas/producto/{id} — reemplaza la receta COMPLETA de un producto.
 *
 * Una receta es un conjunto: un azulito lleva alcohol, curazao y limón. Mandarla
 * entera evita dejar al producto a medio recomponer (el backend la aplica en una
 * transacción) y evita las N peticiones que exigiría el alta renglón por renglón.
 * Una lista vacía borra la receta.
 */
export function useReemplazarReceta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ idProducto, insumos }: { idProducto: number; insumos: RenglonReceta[] }) =>
      client.put<RecetaRecurso[]>(`/recetas/producto/${idProducto}`, { insumos }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.recetas.all });
      // La lista de la pantalla cuelga de `productos` (trae la receta dentro), así
      // que sin esto se quedaría pintando la receta vieja.
      qc.invalidateQueries({ queryKey: qk.productos.all });
      toast.success(variables.insumos.length === 0 ? "Receta eliminada" : "Receta guardada");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}
