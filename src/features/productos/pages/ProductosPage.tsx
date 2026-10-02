import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MoreHorizontal, Plus, Search, Table2, X } from "lucide-react";
import {
  PageHeader,
  DataTable,
  EmptyState,
  ErrorState,
  ConfirmDialog,
  PermissionGate,
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
import { formatMoney } from "@/lib/format";
import { useCategorias } from "@/features/categorias";
import type { CategoriaRecurso } from "@/features/categorias";
import { useActivarProducto, useProductos } from "../api";
import { ProductoFormDialog } from "../components/ProductoFormDialog";
import type { ProductoRecurso } from "../types";

/**
 * Pantalla de Productos (M06). Lista paginada con alta/edición en modal y
 * activar/desactivar disponibilidad (con confirmación). Todo se gatea por
 * `productos.gestionar`. El precio se muestra congelado con `formatMoney` (regla #6).
 *
 * El filtro por categoría es **del servidor** (`GET /productos?id_categoria=`), no un
 * filtro sobre la página visible: con el catálogo repartido en páginas, acotar en
 * cliente escondería justo los productos que se están buscando.
 */
export function ProductosPage() {
  const [page, setPage] = useState(1);
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  /** Lo que se está tecleando; `busqueda` es lo que ya viajó al backend. */
  const [texto, setTexto] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<ProductoRecurso | undefined>();
  const [porAlternar, setPorAlternar] = useState<ProductoRecurso | undefined>();

  const puedeGestionar = useCan("productos.gestionar");

  /**
   * La búsqueda espera a que dejes de teclear: sin esta pausa cada letra sería una
   * petición y la lista parpadearía con resultados intermedios que ya no importan.
   * Al cambiar el término se vuelve a la página 1, igual que con el filtro.
   */
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
      ...(categoriaId === null ? {} : { id_categoria: categoriaId }),
      ...(busqueda === "" ? {} : { buscar: busqueda }),
    }),
    [page, categoriaId, busqueda],
  );
  const productosQuery = useProductos(params);
  // Catálogo de categorías para el selector del formulario (todas, sin paginar corto).
  const categoriasQuery = useCategorias({ per_page: 100 });
  const activar = useActivarProducto();

  const categorias = useMemo<CategoriaRecurso[]>(
    () => categoriasQuery.data?.data ?? [],
    [categoriasQuery.data],
  );

  /**
   * Las píldoras salen en el orden en que se venden: el backend devuelve las
   * categorías por `orden_display`, así que el orden que se define en Categorías es
   * el mismo aquí y en el POS. Las inactivas se quedan en la lista —siguen teniendo
   * productos que administrar— pero se rotulan, porque esconderlas dejaría esos
   * productos inalcanzables desde el filtro.
   */
  const opcionesCategoria = useMemo<OpcionFiltro<number | null>[]>(
    () => [
      { valor: null, etiqueta: "Todas" },
      ...categorias.map((c) => ({
        valor: c.id,
        etiqueta: c.activo ? c.nombre : c.nombre + " (inactiva)",
      })),
    ],
    [categorias],
  );

  /** Cambiar de categoría vuelve a la página 1: la página 3 de "Cervezas" casi nunca existe. */
  function cambiarCategoria(id: number | null) {
    setCategoriaId(id);
    setPage(1);
  }

  /** Limpia el texto sin esperar el debounce: el resultado tiene que volver ya. */
  function limpiarBusqueda() {
    setTexto("");
    setBusqueda("");
    setPage(1);
  }

  function abrirNuevo() {
    setEditando(undefined);
    setFormOpen(true);
  }

  function abrirEdicion(p: ProductoRecurso) {
    setEditando(p);
    setFormOpen(true);
  }

  function confirmarAlternar() {
    if (!porAlternar) return;
    activar.mutate(porAlternar.id, {
      onSuccess: () => setPorAlternar(undefined),
    });
  }

  const columns = useMemo<ColumnDef<ProductoRecurso, unknown>[]>(
    () => [
      {
        header: "Nombre",
        accessorKey: "nombre",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{row.original.nombre}</span>
            {row.original.sku && (
              <span className="text-xs text-text-secondary">{row.original.sku}</span>
            )}
          </div>
        ),
      },
      {
        header: "Categoría",
        cell: ({ row }) => (
          <span className="text-text-secondary">{row.original.categoria?.nombre ?? "—"}</span>
        ),
      },
      {
        header: () => <span className="block text-right">Precio</span>,
        id: "precio_venta",
        cell: ({ row }) => (
          <span className="block text-right font-medium tabular-nums text-foreground">
            {formatMoney(row.original.precio_venta)}
          </span>
        ),
      },
      {
        header: "Disponible",
        cell: ({ row }) =>
          row.original.disponible ? (
            <Badge variant="success">Disponible</Badge>
          ) : (
            <Badge variant="secondary">No disponible</Badge>
          ),
      },
      {
        id: "acciones",
        header: () => <span className="sr-only">Acciones</span>,
        cell: ({ row }) => {
          if (!puedeGestionar) return null;
          const p = row.original;
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Acciones">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => abrirEdicion(p)}>
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant={p.disponible ? "danger" : "default"}
                    onSelect={() => setPorAlternar(p)}
                  >
                    {p.disponible ? "Marcar no disponible" : "Marcar disponible"}
                  </DropdownMenuItem>
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
        <PageHeader title="Productos" description="Gestiona el menú que se vende." />
        <ErrorState error={productosQuery.error} onRetry={() => productosQuery.refetch()} />
      </>
    );
  }

  const total = productosQuery.data?.meta?.total;
  const filtrando = categoriaId !== null;

  return (
    <>
      <PageHeader
        title="Productos"
        description="Gestiona el menú que se vende en el POS."
        actions={
          <PermissionGate permiso="productos.gestionar">
            <div className="flex gap-2">
              {/* Cargar el menú entero es la tarea del primer día; dar de alta uno
                  suelto, la del resto del año. Por eso la rejilla va como acción
                  secundaria: se busca cuando se necesita, sin estorbar al día a día. */}
              <Button variant="outline" asChild>
                <Link to="/app/productos/cargar">
                  <Table2 />
                  Cargar menú
                </Link>
              </Button>
              <Button onClick={abrirNuevo}>
                <Plus />
                Nuevo producto
              </Button>
            </div>
          </PermissionGate>
        }
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
              // Nombre distinto al del botón del estado vacío: dos controles con el
              // mismo nombre accesible se leen como el mismo control.
              aria-label="Borrar búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-text-secondary hover:bg-surface-2"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {categorias.length > 0 && (
          <FiltroPills
            etiqueta="Filtrar por categoría"
            opciones={opcionesCategoria}
            valor={categoriaId}
            onChange={cambiarCategoria}
          />
        )}

        {/* El conteo confirma que el filtro hizo algo, sin obligar a contar filas. */}
        {total != null && !productosQuery.isLoading && (
          <p className="text-sm text-text-secondary" aria-live="polite">
            {total === 1 ? "1 producto" : total + " productos"}
          </p>
        )}
      </div>

      <DataTable
        columns={columns}
        data={productosQuery.data?.data ?? []}
        meta={productosQuery.data?.meta}
        page={page}
        onPageChange={setPage}
        isLoading={productosQuery.isLoading}
        emptyState={
          busqueda !== "" ? (
            // Buscar y no encontrar no significa que el catálogo esté vacío: la salida
            // es soltar el término, no dar de alta el producto que quizá ya existe.
            <EmptyState
              title={"Sin resultados para «" + busqueda + "»"}
              description={
                filtrando
                  ? "Puede estar en otra categoría: prueba quitando también el filtro."
                  : "Revisa el texto o prueba con el SKU."
              }
              action={
                <Button variant="outline" onClick={limpiarBusqueda}>
                  Limpiar búsqueda
                </Button>
              }
            />
          ) : filtrando ? (
            // Con un filtro puesto el catálogo NO está vacío: decir "crea el primero"
            // mandaría a dar de alta un producto que probablemente ya existe.
            <EmptyState
              title="Sin productos en esta categoría"
              description="Prueba con otra categoría o quita el filtro."
              action={
                <Button variant="outline" onClick={() => cambiarCategoria(null)}>
                  Ver todos
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="Aún no hay productos"
              description="Crea el primer producto para empezar a vender."
              action={
                <PermissionGate permiso="productos.gestionar">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    {/* Con el catálogo vacío lo que sigue casi siempre es cargar el
                        menú completo, no un producto suelto: va como acción principal. */}
                    <Button asChild>
                      <Link to="/app/productos/cargar">
                        <Table2 />
                        Cargar menú
                      </Link>
                    </Button>
                    <Button variant="outline" onClick={abrirNuevo}>
                      <Plus />
                      Nuevo producto
                    </Button>
                  </div>
                </PermissionGate>
              }
            />
          )
        }
      />

      <ProductoFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        producto={editando}
        categorias={categorias}
      />

      <ConfirmDialog
        open={Boolean(porAlternar)}
        onOpenChange={(o) => !o && setPorAlternar(undefined)}
        title={porAlternar?.disponible ? "Marcar no disponible" : "Marcar disponible"}
        description={
          porAlternar?.disponible
            ? `${porAlternar?.nombre} dejará de aparecer para la venta.`
            : `${porAlternar?.nombre} volverá a aparecer para la venta.`
        }
        confirmLabel={porAlternar?.disponible ? "Marcar no disponible" : "Marcar disponible"}
        destructive={porAlternar?.disponible ?? false}
        loading={activar.isPending}
        onConfirm={confirmarAlternar}
      />
    </>
  );
}
