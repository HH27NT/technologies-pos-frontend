import { useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { useAuthStore } from "@/lib/auth";
import { useAgregarItem, useOrden, useSaldoOrden } from "../api";
import { ProductoPicker } from "../components/ProductoPicker";
import { TicketPanel } from "../components/TicketPanel";

/**
 * Pantalla de trabajo de una orden (M11): rejilla de productos + ticket con
 * totales y acciones. Agregar productos exige caja abierta (regla #5).
 *
 * Regla de layout: **la página nunca scrollea; scrollean los paneles**. La
 * pantalla se acota a la altura de la ventana y cada panel maneja su propio
 * desbordamiento. Sin esto, un catálogo de 80 productos estira la columna del
 * menú, la página entera scrollea y el ticket —con el botón Cobrar— se va hacia
 * arriba: la acción más frecuente del turno quedaría detrás de un scroll.
 *
 *  - ≥lg  ambos paneles lado a lado (iPad horizontal y escritorio).
 *  - <lg  una vista a la vez, alternada por pestañas. La pestaña de la orden
 *         lleva el total, para no perderlo de vista mientras se toma el pedido.
 */
export function PosOrdenPage() {
  const { id } = useParams();
  const idOrden = id ? Number(id) : undefined;
  const navigate = useNavigate();

  /** Solo aplica <lg; en pantallas anchas ambos paneles se muestran siempre. */
  const [vista, setVista] = useState<"menu" | "orden">("menu");

  const cajaAbierta = useAuthStore((s) => s.cajaAbierta);
  const ordenQuery = useOrden(idOrden);
  const saldoQuery = useSaldoOrden(idOrden);
  const agregarItem = useAgregarItem();

  const orden = ordenQuery.data;
  const abierta = orden?.estado === "abierta";
  const puedeAgregar = cajaAbierta && abierta && !agregarItem.isPending;

  // Unidades activas (no líneas): es lo que el mesero cuenta como "lo que lleva".
  const unidades = (orden?.detalles ?? [])
    .filter((d) => d.estado_item === "activo")
    .reduce((acc, d) => acc + Math.round(Number(d.cantidad)), 0);

  function agregar(idProducto: number) {
    if (!idOrden) return;
    agregarItem.mutate({ idOrden, id_producto: idProducto, cantidad: 1 });
    // Al agregar desde la pestaña del menú la orden no está a la vista; el
    // contador y el total de la pestaña son la confirmación de que entró.
  }

  return (
    // Altura de la ventana menos el header del POS (3.5rem) y el padding del
    // main (p-3 → 1.5rem; md:p-4 → 2rem). `dvh` y no `vh`: en Safari iOS la
    // barra de direcciones se retrae y `vh` deja el panel cortado.
    <div className="mx-auto flex h-[calc(100dvh-3.5rem-1.5rem)] max-w-7xl flex-col md:h-[calc(100dvh-3.5rem-2rem)]">
      <div className="mb-3 flex shrink-0 items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/pos")}>
          <ArrowLeft />
          Órdenes
        </Button>
        {!cajaAbierta && (
          <span className="text-sm text-danger">
            Caja cerrada — las ventas están deshabilitadas.
          </span>
        )}
      </div>

      {ordenQuery.isError ? (
        <ErrorState error={ordenQuery.error} onRetry={() => ordenQuery.refetch()} />
      ) : ordenQuery.isLoading || !orden ? (
        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_380px]">
          <div className="animate-pulse rounded-xl bg-surface-2" />
          <div className="hidden animate-pulse rounded-xl bg-surface-2 lg:block" />
        </div>
      ) : (
        <>
          {/* Alternador de vista (solo donde no caben los dos paneles) */}
          <div className="mb-3 flex shrink-0 gap-2 lg:hidden">
            <PestanaVista activa={vista === "menu"} onClick={() => setVista("menu")}>
              Menú
            </PestanaVista>
            <PestanaVista activa={vista === "orden"} onClick={() => setVista("orden")}>
              Orden ({unidades})
              <span className="ml-1.5 font-display tabular-nums">
                {formatMoney(orden.total)}
              </span>
            </PestanaVista>
          </div>

          <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_380px]">
            {/* min-h-0 en cada panel: sin él, un hijo con overflow-y-auto crece
                en vez de scrollear (min-height:auto es el default en grid/flex). */}
            <div
              className={cn(
                "min-h-0 overflow-hidden rounded-xl border border-border bg-surface-0 p-3",
                vista === "menu" ? "flex" : "hidden",
                "lg:flex",
              )}
            >
              <ProductoPicker onAdd={agregar} disabled={!puedeAgregar} />
            </div>

            <div className={cn("min-h-0", vista === "orden" ? "block" : "hidden", "lg:block")}>
              <TicketPanel
                orden={orden}
                saldo={saldoQuery.data}
                cajaAbierta={cajaAbierta}
                onAnulada={() => navigate("/pos")}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Pestaña del alternador menú/orden (táctil: cumple el mínimo de 48px del POS). */
function PestanaVista({
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
      aria-pressed={activa}
      className={cn(
        // min-w-0 + overflow-hidden: `flex-1` no encoge por debajo del ancho de
        // su texto (min-width:auto), así que en una pantalla de 320px con un
        // total de 6 cifras la pestaña ensancharía la página entera.
        "min-h-tap min-w-0 flex-1 overflow-hidden rounded-lg border px-2 text-base transition-colors sm:px-3",
        activa
          ? "border-primary bg-surface-2 font-medium text-foreground"
          : "border-border text-text-secondary hover:bg-surface-2",
      )}
    >
      {children}
    </button>
  );
}
