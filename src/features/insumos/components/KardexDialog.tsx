import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DataTable, EmptyState, ErrorState, type ColumnDef } from "@/components/shared";
import { formatFechaHora } from "@/lib/format";
import { useKardex } from "../api";
import type { InsumoRecurso, MovimientoRecurso, TipoMovimiento } from "../types";

interface KardexDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Insumo cuyo kardex se muestra. */
  insumo?: InsumoRecurso;
}

const VARIANTE_TIPO: Record<TipoMovimiento, "success" | "danger" | "info"> = {
  entrada: "success",
  merma: "danger",
  ajuste: "info",
};

const ETIQUETA_TIPO: Record<TipoMovimiento, string> = {
  entrada: "Entrada",
  ajuste: "Ajuste",
  merma: "Merma",
};

/**
 * Kardex de un insumo (M08): lista paginada de sus movimientos, más reciente
 * primero. Solo lectura; los importes/cantidades llegan congelados del backend.
 */
export function KardexDialog({ open, onOpenChange, insumo }: KardexDialogProps) {
  const [page, setPage] = useState(1);
  const kardexQuery = useKardex(open ? insumo?.id : undefined, { page });

  const columns = useMemo<ColumnDef<MovimientoRecurso, unknown>[]>(
    () => [
      {
        header: "Fecha",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-text-secondary">
            {row.original.created_at ? formatFechaHora(row.original.created_at) : "—"}
          </span>
        ),
      },
      {
        header: "Tipo",
        cell: ({ row }) => (
          <Badge variant={VARIANTE_TIPO[row.original.tipo]}>
            {ETIQUETA_TIPO[row.original.tipo]}
          </Badge>
        ),
      },
      {
        header: () => <span className="block text-right">Cantidad</span>,
        id: "cantidad",
        cell: ({ row }) => (
          <span className="block text-right tabular-nums text-foreground">
            {row.original.cantidad}
          </span>
        ),
      },
      {
        header: () => <span className="block text-right">Existencia</span>,
        id: "stock_resultante",
        cell: ({ row }) => (
          <span className="block text-right font-medium tabular-nums text-foreground">
            {row.original.stock_resultante}
          </span>
        ),
      },
      {
        header: "Motivo",
        cell: ({ row }) => (
          <span className="text-text-secondary">{row.original.motivo ?? "—"}</span>
        ),
      },
    ],
    [],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Kardex</DialogTitle>
          <DialogDescription>
            {insumo
              ? `${insumo.nombre} · existencia actual ${insumo.stock_actual} ${insumo.unidad_medida?.abreviacion ?? ""}`
              : "Movimientos del insumo."}
          </DialogDescription>
        </DialogHeader>

        {kardexQuery.isError ? (
          <ErrorState error={kardexQuery.error} onRetry={() => kardexQuery.refetch()} />
        ) : (
          <DataTable
            columns={columns}
            data={kardexQuery.data?.data ?? []}
            meta={kardexQuery.data?.meta}
            page={page}
            onPageChange={setPage}
            isLoading={kardexQuery.isLoading}
            emptyState={
              <EmptyState
                title="Sin movimientos"
                description="Este insumo aún no tiene entradas, ajustes ni mermas."
              />
            }
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
