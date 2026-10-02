import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MoreHorizontal, Search, X } from "lucide-react";
import {
  PageHeader,
  DataTable,
  EmptyState,
  ErrorState,
  ConfirmDialog,
  FiltroPills,
  type ColumnDef,
  type OpcionFiltro,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCan } from "@/lib/auth";
import { formatCantidadConUnidad } from "@/lib/format";
import { useProductosConReceta, useReemplazarReceta } from "../api";
import { RecetaProductoDialog } from "../components/RecetaProductoDialog";
import type { ProductoConReceta } from "../types";

/** Qué se está mirando: todo el catálogo o solo lo que falta por recetear. */
type Alcance = "todos" | "sin_receta";

/**
 * Pantalla de Recetas / BOM (M07).
 *
 * **Es una lista de productos, no de renglones.** Antes cada par producto↔insumo era
 * una fila, y una receta de dos insumos se leía como dos productos: el segundo salía
 * con la columna "Producto" vacía, huérfano. Peor, `GET /recetas` pagina por renglón,
 * así que una receta larga se partía entre dos páginas. Ahora la fila es el producto
 * y sus insumos van dentro (`GET /productos?con_recetas=1`), que además trae el
 * buscador del servidor y el filtro de los que aún no tienen receta.
 *
 * Solo se listan los productos que **descuentan inventario**: una receta sobre uno
 * que no descuenta no hace nada al venderse. Se gatea por `recetas.gestionar`.
 */
export function RecetasPage() {
  const [page, setPage] = useState(1);
  const [alcance, setAlcance] = useState<Alcance>("todos");
  /** Lo que se está tecleando; `busqueda` es lo que ya viajó al backend. */
  const [texto, setTexto] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  /**
   * Producto cuya receta se arma. Se conserva al cerrar el diálogo para no desmontarlo
   * a media animación de salida.
   */
  const [productoEnEdicion, setProductoEnEdicion] = useState<
    { id: number; nombre: string } | undefined
  >();
  const [porQuitar, setPorQuitar] = useState<ProductoConReceta | undefined>();

  const puedeGestionar = useCan("recetas.gestionar");

  /** Misma pausa que en Productos: sin ella cada letra sería una petición. */
  useEffect(() => {
    const termino = texto.trim();
    const id = setTimeout(() => {
      setBusqueda(termino);
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [texto]);

  const params = useMemo(
    () => ({
      page,
      controla_inventario: 1,
      ...(alcance === "sin_receta" ? { sin_receta: 1 } : {}),
      ...(busqueda === "" ? {} : { buscar: busqueda }),
    }),
    [page, alcance, busqueda],
  );
  const productosQuery = useProductosConReceta(params);

  /**
   * Cuántos productos siguen sin receta, en todo el catálogo y no solo en la página.
   * Se pide una sola fila y se lee el total: el aviso no puede costar traerse el
   * catálogo entero. Es el cierre de la carga del menú — lo que no se ve, no se
   * captura —, así que va en la píldora, donde también sirve de atajo.
   */
  const faltantesQuery = useProductosConReceta({
    controla_inventario: 1,
    sin_receta: 1,
    per_page: 1,
  });
  const faltantes = faltantesQuery.data?.meta?.total;

  const quitar = useReemplazarReceta();

  const filas = useMemo<ProductoConReceta[]>(
    () => productosQuery.data?.data ?? [],
    [productosQuery.data],
  );

  const opcionesAlcance = useMemo<OpcionFiltro<Alcance>[]>(
    () => [
      { valor: "todos", etiqueta: "Todos" },
      {
        valor: "sin_receta",
        etiqueta: faltantes == null ? "Sin receta" : "Sin receta (" + faltantes + ")",
      },
    ],
    [faltantes],
  );

  function cambiarAlcance(valor: Alcance) {
    setAlcance(valor);
    setPage(1);
  }

  /** Limpia el texto sin esperar el debounce: el resultado tiene que volver ya. */
  function limpiarBusqueda() {
    setTexto("");
    setBusqueda("");
    setPage(1);
  }

  /** Se edita la receta **del producto**: una receta es el conjunto, no un renglón. */
  function abrirEdicion(p: ProductoConReceta) {
    setProductoEnEdicion({ id: p.id, nombre: p.nombre });
    setFormOpen(true);
  }

  /** Quitar la receta es mandarla vacía: el producto no se toca. */
  function confirmarQuitar() {
    if (!porQuitar) return;
    quitar.mutate(
      { idProducto: porQuitar.id, insumos: [] },
      { onSuccess: () => setPorQuitar(undefined) },
    );
  }

  const columns = useMemo<ColumnDef<ProductoConReceta, unknown>[]>(
    () => [
      {
        header: "Producto",
        accessorKey: "nombre",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{row.original.nombre}</span>
            {/* La categoría distingue dos "Corona 355ml" de distinto precio, que es
                justo lo que pasa cuando el menú se carga por lote. */}
            <span className="text-xs text-text-secondary">
              {row.original.categoria?.nombre ?? "—"}
            </span>
          </div>
        ),
      },
      {
        header: "Insumos que consume",
        id: "insumos",
        cell: ({ row }) => {
          const renglones = row.original.recetas ?? [];
          if (renglones.length === 0) {
            return (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Sin receta</Badge>
                {puedeGestionar && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => abrirEdicion(row.original)}
                  >
                    Armar receta
                  </Button>
                )}
              </div>
            );
          }
          return (
            <ul className="space-y-1">
              {renglones.map((r) => (
                <li key={r.id} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-foreground">{r.insumo?.nombre ?? "—"}</span>
                  <span className="tabular-nums text-text-secondary">
                    {formatCantidadConUnidad(r.cantidad, r.insumo?.unidad_medida?.abreviacion)}
                  </span>
                </li>
              ))}
            </ul>
          );
        },
      },
      {
        id: "acciones",
        header: () => <span className="sr-only">Acciones</span>,
        cell: ({ row }) => {
          if (!puedeGestionar) return null;
          const p = row.original;
          const tieneReceta = (p.recetas ?? []).length > 0;
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={"Acciones de " + p.nombre}>
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => abrirEdicion(p)}>
                    {tieneReceta ? "Editar receta" : "Armar receta"}
                  </DropdownMenuItem>
                  {tieneReceta && (
                    <DropdownMenuItem variant="danger" onSelect={() => setPorQuitar(p)}>
                      Quitar receta
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [puedeGestionar],
  );

  if (productosQuery.isError) {
    return (
      <>
        <PageHeader title="Recetas" description="Define qué insumos consume cada producto." />
        <ErrorState error={productosQuery.error} onRetry={() => productosQuery.refetch()} />
      </>
    );
  }

  const total = productosQuery.data?.meta?.total;
  const insumosDeQuitar = (porQuitar?.recetas ?? []).length;

  return (
    <>
      {/* Sin botón de "Nueva receta": una receta no se crea suelta, es una propiedad del
          producto. Se entra desde su fila, que además ya dice si tiene receta o no. El
          botón preguntaba "¿de cuál producto?" para acabar abriendo la que ya existía. */}
      <PageHeader
        title="Recetas"
        description="Define qué insumos consume cada producto al venderse. Solo aparecen los productos que descuentan inventario."
      />

      <div className="mb-4 space-y-3">
        <div className="relative max-w-sm">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted"
          />
          <Input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar por nombre o SKU"
            aria-label="Buscar productos"
            className="pl-9 pr-9"
          />
          {texto !== "" && (
            <button
              type="button"
              onClick={limpiarBusqueda}
              aria-label="Borrar búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-text-secondary hover:bg-surface-2"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <FiltroPills
          etiqueta="Filtrar recetas"
          opciones={opcionesAlcance}
          valor={alcance}
          onChange={cambiarAlcance}
        />

        {total != null && !productosQuery.isLoading && (
          <p className="text-sm text-text-secondary" aria-live="polite">
            {total === 1 ? "1 producto" : total + " productos"}
          </p>
        )}
      </div>

      <DataTable
        columns={columns}
        data={filas}
        meta={productosQuery.data?.meta}
        page={page}
        onPageChange={setPage}
        isLoading={productosQuery.isLoading}
        emptyState={
          busqueda !== "" ? (
            <EmptyState
              title={"Sin resultados para «" + busqueda + "»"}
              description={
                alcance === "sin_receta"
                  ? "Puede que ese producto ya tenga receta: prueba en «Todos»."
                  : "Revisa el texto o prueba con el SKU."
              }
              action={
                <Button variant="outline" onClick={limpiarBusqueda}>
                  Limpiar búsqueda
                </Button>
              }
            />
          ) : alcance === "sin_receta" ? (
            // Que no haya nada aquí es una buena noticia, y hay que decirlo así.
            <EmptyState
              title="Todos tienen receta"
              description="Ningún producto que descuenta inventario se quedó sin sus insumos."
              action={
                <Button variant="outline" onClick={() => cambiarAlcance("todos")}>
                  Ver todos
                </Button>
              }
            />
          ) : (
            // Sin productos que descuenten inventario no hay nada que recetear, y el
            // camino no es crear una receta: es encender el inventario en el producto.
            <EmptyState
              title="Ningún producto descuenta inventario"
              description="La receta descuenta insumos al vender, así que primero enciende el inventario en los productos que salen del almacén."
              action={
                <Button variant="outline" asChild>
                  <Link to="/app/productos">Ir a productos</Link>
                </Button>
              }
            />
          )
        }
      />

      {productoEnEdicion && (
        <RecetaProductoDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          producto={productoEnEdicion}
        />
      )}

      <ConfirmDialog
        open={Boolean(porQuitar)}
        onOpenChange={(o) => !o && setPorQuitar(undefined)}
        title="Quitar receta"
        description={
          porQuitar
            ? `"${porQuitar.nombre}" dejará de descontar ${
                insumosDeQuitar === 1 ? "su insumo" : "sus " + insumosDeQuitar + " insumos"
              } al venderse. El producto y los insumos no se tocan.`
            : ""
        }
        confirmLabel="Quitar receta"
        destructive
        loading={quitar.isPending}
        onConfirm={confirmarQuitar}
      />
    </>
  );
}
