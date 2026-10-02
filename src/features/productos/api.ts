import { useEffect } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { client } from "@/lib/api/client";
import { qk } from "@/lib/api/queryKeys";
import type { ApiError, Paginated } from "@/lib/api/types";
import type { ProductoRecurso } from "./types";

/**
 * Hooks de datos de Productos (M06). Lecturas paginadas + mutaciones con
 * invalidación de query keys. Errores del backend mostrados tal cual (regla #2).
 * Nunca se envía `id_establecimiento` (regla #4). El dinero se envía tal como
 * lo captura el usuario; el backend lo congela (regla #6).
 */

/** GET /productos — lista paginada. `opciones.enabled` permite diferir la carga. */
export function useProductos(
  params?: Record<string, unknown>,
  opciones?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: qk.productos.list(params),
    queryFn: () => client.get<Paginated<ProductoRecurso>>("/productos", { params }),
    enabled: opciones?.enabled,
  });
}

/**
 * Atajo "esto sale del almacén tal cual" (M06+M08). Su presencia en el alta hace que
 * el backend cree también el insumo y una receta 1:1, y encienda el inventario. Sin
 * él harían falta tres pantallas —producto, insumo, receta— por cada botella o lata,
 * que en una cantina es casi todo el menú.
 *
 * El costo va aquí y no en `costo_referencia` porque, con inventario encendido, el
 * reporte de margen toma el costo de los insumos de la receta e **ignora** el del
 * producto (verificado en `MargenQuery`).
 */
export interface InsumoDelProducto {
  id_unidad_medida: number;
  costo_unitario?: number;
}

/** Payload que envía el formulario (sin id para crear; con id para editar). */
export interface GuardarProductoPayload {
  id?: number;
  nombre: string;
  id_categoria: number;
  precio_venta: number;
  descripcion?: string;
  costo_referencia?: number;
  sku?: string;
  controla_inventario: boolean;
  /** Solo en alta: crea el insumo y la receta 1:1 junto con el producto. */
  insumo?: InsumoDelProducto;
}

/** POST /productos (crear) o PUT /productos/{id} (editar). */
export function useGuardarProducto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: GuardarProductoPayload) => {
      const payload: Record<string, unknown> = {
        nombre: input.nombre,
        id_categoria: input.id_categoria,
        precio_venta: input.precio_venta,
        controla_inventario: input.controla_inventario,
      };
      if (input.descripcion?.trim()) payload.descripcion = input.descripcion.trim();
      if (input.sku?.trim()) payload.sku = input.sku.trim();
      if (input.costo_referencia != null) {
        payload.costo_referencia = input.costo_referencia;
      }
      // Solo tiene efecto al crear: el backend no reabre el atajo en una edición.
      if (!id && input.insumo) payload.insumo = input.insumo;
      return id
        ? client.put<ProductoRecurso>(`/productos/${id}`, payload)
        : client.post<ProductoRecurso>("/productos", payload);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.productos.all });
      toast.success(variables.id ? "Producto actualizado" : "Producto creado");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

/**
 * Nombres del catálogo completo, para avisar de repetidos antes de guardar un lote.
 *
 * Pagina hasta agotar la lista porque el API topa `per_page` en 100 (§4.5) y un
 * catálogo con 120 productos dejaría 20 sin comparar: el aviso solo sirve si mira
 * todo. En el caso que importa —un establecimiento que estrena el sistema— son cero
 * o una petición, y solo se pide desde la rejilla, que es quien monta este hook.
 */
export function useNombresDeProductos() {
  return useQuery({
    queryKey: [...qk.productos.all, "nombres"],
    queryFn: async () => {
      const nombres: string[] = [];
      for (let pagina = 1; ; pagina += 1) {
        const respuesta = await client.get<Paginated<ProductoRecurso>>("/productos", {
          params: { page: pagina, per_page: 100 },
        });
        for (const p of respuesta.data) nombres.push(p.nombre);
        if (pagina >= (respuesta.meta?.last_page ?? 1)) break;
      }
      return nombres;
    },
  });
}

/**
 * Catálogo completo de productos, paginado hasta agotarlo.
 *
 * El POS **no puede** trabajar con una sola página: el API topa `per_page` en 100
 * (§4.5), así que un bar con 140 productos dejaba 40 imposibles de vender, y una
 * categoría cuyos productos cayeran fuera de esas 100 filas se pintaba vacía —como
 * si al negocio le faltaran los postres. Filtrar por categoría contra el servidor
 * tampoco sirve aquí: en la barra se salta de sección en sección a cada comanda, y
 * pagar una ida al servidor por toque es justo lo que hace lento un POS.
 *
 * Por eso se traen todas las páginas y se filtra en memoria. La primera llega
 * enseguida y se pinta; las demás entran solas por detrás, así que la pantalla es
 * usable de inmediato y se completa sin que nadie espere. `hasNextPage` dice si
 * todavía falta catálogo, para no presentar como completo lo que aún no lo está.
 */
export function useCatalogoCompleto(opciones?: { enabled?: boolean }) {
  const query = useInfiniteQuery({
    queryKey: [...qk.productos.all, "catalogo"],
    queryFn: ({ pageParam }) =>
      client.get<Paginated<ProductoRecurso>>("/productos", {
        params: { page: pageParam, per_page: 100 },
      }),
    initialPageParam: 1,
    getNextPageParam: (ultima) =>
      ultima.meta.current_page < ultima.meta.last_page
        ? ultima.meta.current_page + 1
        : undefined,
    enabled: opciones?.enabled,
  });

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    // Encadena la siguiente página en cuanto llega la anterior. Sin esto habría que
    // pedirlas a mano y volveríamos al catálogo truncado.
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return query;
}

/** Tope de filas por lote que impone el backend (GuardarProductosLoteRequest). */
export const MAXIMO_POR_LOTE = 100;

/** Una fila del lote, ya saneada por la rejilla. */
export interface FilaLote {
  nombre: string;
  id_categoria: number;
  precio_venta: number;
  descripcion?: string;
  costo_referencia?: number;
  sku?: string;
  controla_inventario?: boolean;
  insumo?: InsumoDelProducto;
}

/**
 * POST /productos/lote — alta masiva para la carga inicial del menú.
 *
 * Es **todo o nada** en el backend: si una fila no valida, no se crea ninguna. Por
 * eso aquí no se parte el envío en tandas; el tope de 100 lo aplica la rejilla antes
 * de llegar. Un guardado a medias dejaría a la persona sin saber qué entró y, como
 * el catálogo no exige nombre único, reintentar duplicaría lo ya creado.
 *
 * El toast de éxito no se pone aquí: la rejilla necesita decir cuántos entraron y
 * ofrecer seguir cargando, que es más útil que un "Producto creado" genérico.
 */
export function useCrearProductosLote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productos: FilaLote[]) =>
      client.post<ProductoRecurso[]>("/productos/lote", { productos }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.productos.all }),
    onError: (e: ApiError) => toast.error(e.message),
  });
}

/**
 * Traduce los errores del backend ("productos.3.nombre") a un mapa por índice de
 * fila. Sin esto la rejilla solo podría mostrar el mensaje general y la persona
 * tendría que buscar a mano cuál de las ochenta filas está mal.
 */
export function erroresPorFila(error: ApiError): Map<number, string> {
  const porFila = new Map<number, string>();
  for (const [clave, mensajes] of Object.entries(error.errors ?? {})) {
    const match = /^productos\.(\d+)\./.exec(clave);
    if (!match || mensajes.length === 0) continue;
    const indice = Number(match[1]);
    // Se conserva el primer mensaje de la fila: la celda tiene sitio para uno, y el
    // resto se ve al corregirlo y reintentar.
    if (!porFila.has(indice)) porFila.set(indice, mensajes[0]);
  }
  return porFila;
}

/** PATCH /productos/{id}/activar — alterna la disponibilidad en venta. */
export function useActivarProducto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => client.patch<ProductoRecurso>(`/productos/${id}/activar`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.productos.all });
      toast.success("Disponibilidad actualizada");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}
