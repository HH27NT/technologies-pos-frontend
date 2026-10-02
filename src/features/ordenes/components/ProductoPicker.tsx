import { useMemo, useState, type ReactNode } from "react";
import { Search, X } from "lucide-react";
import { EmptyState, ErrorState } from "@/components/shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatMoney, normalizarTexto } from "@/lib/format";
import { useCatalogoCompleto } from "@/features/productos";
import { useCategorias } from "@/features/categorias";

interface ProductoPickerProps {
  /** Agrega el producto a la orden (1 unidad). */
  onAdd: (idProducto: number) => void;
  /** Deshabilita el picker (sin caja, orden no editable o mutación en curso). */
  disabled?: boolean;
}

/**
 * Rejilla táctil de productos con filtro por categoría (M11). Tocar una tarjeta
 * agrega una unidad a la orden activa. Los precios se muestran congelados.
 *
 * El filtro queda fijo y solo la rejilla scrollea: con un catálogo grande, las
 * categorías son justamente lo que más se usa para navegarlo, y perderlas al
 * hacer scroll obligaría a subir cada vez que se cambia de categoría.
 *
 * **El catálogo se trae completo** (`useCatalogoCompleto`), no una página: pedía
 * `per_page: 100` y en un bar con más de cien productos los de más allá no podían
 * venderse —y su categoría se veía vacía, como si no existieran. Con todo en
 * memoria, cambiar de categoría o buscar es instantáneo, que es lo que un POS
 * necesita: en la barra se cambia de sección a cada comanda.
 */
export function ProductoPicker({ onAdd, disabled }: ProductoPickerProps) {
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [busqueda, setBusqueda] = useState("");

  const productosQuery = useCatalogoCompleto();
  const categoriasQuery = useCategorias({ per_page: 100 });

  /** Todas las páginas ya traídas, aplanadas y sin los productos dados de baja. */
  const disponibles = useMemo(
    () =>
      (productosQuery.data?.pages ?? [])
        .flatMap((pagina) => pagina.data)
        .filter((p) => p.disponible),
    [productosQuery.data],
  );

  const termino = normalizarTexto(busqueda);

  const productos = useMemo(() => {
    // La búsqueda manda sobre la categoría: quien escribe "corona" quiere la cerveza,
    // no que no aparezca porque el filtro estaba en "Alimentos".
    if (termino !== "") {
      return disponibles.filter(
        (p) =>
          normalizarTexto(p.nombre).includes(termino) ||
          (p.sku !== null && normalizarTexto(p.sku).includes(termino)),
      );
    }
    return categoriaId ? disponibles.filter((p) => p.id_categoria === categoriaId) : disponibles;
  }, [disponibles, categoriaId, termino]);

  const categorias = (categoriasQuery.data?.data ?? []).filter((c) => c.activo);
  /** Todavía entran páginas: lo que se ve puede no ser todo el catálogo. */
  const cargandoResto = productosQuery.hasNextPage === true;

  return (
    <div className="flex h-full w-full flex-col">
      {/* Buscador y filtro por categoría (fijos) */}
      <div className="shrink-0 space-y-3 pb-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted"
            aria-hidden
          />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto o SKU"
            aria-label="Buscar producto"
            className="min-h-tap pl-9 pr-9 lg:min-h-0"
          />
          {busqueda !== "" && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setBusqueda("")}
              aria-label="Limpiar búsqueda"
              className="absolute right-1 top-1/2 -translate-y-1/2"
            >
              <X />
            </Button>
          )}
        </div>

        {/* Con una búsqueda escrita las categorías no filtran, así que estorban. */}
        {termino === "" && (
          <div className="flex flex-wrap gap-2">
            <CategoriaPill activa={categoriaId === null} onClick={() => setCategoriaId(null)}>
              Todas
            </CategoriaPill>
            {categorias.map((c) => (
              <CategoriaPill
                key={c.id}
                activa={categoriaId === c.id}
                onClick={() => setCategoriaId(c.id)}
              >
                {c.nombre}
              </CategoriaPill>
            ))}
          </div>
        )}
      </div>

      {/* Rejilla de productos (única zona que scrollea) */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {productosQuery.isError ? (
          // Un fallo al leer el catálogo NO es un catálogo vacío: sin esto, un 403
          // ("No tienes permiso…") se pintaba como "Sin productos" y parecía que al
          // establecimiento le faltaban productos.
          <ErrorState
            error={productosQuery.error}
            onRetry={() => productosQuery.refetch()}
          />
        ) : productosQuery.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-surface-2" />
            ))}
          </div>
        ) : productos.length === 0 ? (
          // Decir cuál de los tres vacíos es: buscar sin resultados, una categoría sin
          // productos y un catálogo aún cargando se arreglan de maneras distintas.
          <EmptyState
            title={termino === "" ? "Sin productos" : "Nada coincide"}
            description={
              cargandoResto
                ? "Todavía se está cargando el catálogo; espera un momento."
                : termino !== ""
                  ? `Ningún producto disponible coincide con "${busqueda.trim()}".`
                  : categoriaId === null
                    ? "No hay productos disponibles para vender."
                    : "No hay productos disponibles en esta categoría."
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {productos.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                onClick={() => onAdd(p.id)}
                className={cn(
                  "flex min-h-tap flex-col justify-between rounded-lg border border-border bg-surface-1 p-3 text-left transition-colors",
                  "hover:border-primary hover:bg-surface-2",
                  "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-surface-1",
                )}
              >
                <span className="line-clamp-2 text-base font-medium text-foreground">
                  {p.nombre}
                </span>
                <span className="line-clamp-1 text-sm text-text-muted">
                  {p.categoria?.nombre ?? ""}
                </span>
                <span className="mt-2 font-display text-md tabular-nums text-text-secondary">
                  {formatMoney(p.precio_venta)}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Nunca presentar como completo lo que aún no lo está. */}
        {cargandoResto && productos.length > 0 && (
          <p className="pt-3 text-center text-sm text-text-muted">
            Cargando el resto del catálogo…
          </p>
        )}
      </div>
    </div>
  );
}

function CategoriaPill({
  activa,
  onClick,
  children,
}: {
  activa: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        // Más alto en táctil (el POS exige 48px); densidad original en escritorio.
        "min-h-tap rounded-full border px-4 text-sm transition-colors lg:min-h-0 lg:px-3 lg:py-1.5",
        activa
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-text-secondary hover:bg-surface-2",
      )}
    >
      {children}
    </button>
  );
}
