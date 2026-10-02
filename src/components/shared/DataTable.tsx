import type { ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PaginationMeta } from "@/lib/api/types";

interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  /** Meta de paginación del backend. Si se pasa, se muestran los controles. */
  meta?: PaginationMeta;
  /** Página actual (controlada por la página que consume la tabla). */
  page?: number;
  onPageChange?: (page: number) => void;
  /** Muestra filas esqueleto durante la carga. */
  isLoading?: boolean;
  /** Qué renderizar cuando no hay filas (usa <EmptyState/>). */
  emptyState?: ReactNode;
}

/**
 * Tabla de datos compartida (TanStack Table) con **paginación del lado del
 * servidor**: no ordena ni pagina en el cliente, solo pinta `data` y expone los
 * controles prev/next leyendo `meta` (regla de oro #1/#6: nada se recalcula aquí).
 *
 * Se pinta de dos formas según el ancho. Desde `md` es una tabla normal. Por debajo,
 * cada fila pasa a una tarjeta con los encabezados como etiquetas: una tabla de seis
 * columnas en un teléfono obliga a un scroll horizontal donde se pierde de vista a
 * qué fila pertenece cada dato. La conversión es automática — las quince pantallas
 * que consumen este componente no declaran nada extra — porque se reusan las mismas
 * `columns`: el encabezado se vuelve la etiqueta y la celda, el valor.
 *
 * Las columnas sin encabezado (la de acciones) se detectan por eso mismo y se pintan
 * a lo ancho al pie de la tarjeta, sin etiqueta.
 */
export function DataTable<T>({
  columns,
  data,
  meta,
  page,
  onPageChange,
  isLoading = false,
  emptyState,
}: DataTableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  const paginaActual = page ?? meta?.current_page ?? 1;
  const ultimaPagina = meta?.last_page ?? 1;
  const hayControles = Boolean(meta && onPageChange && ultimaPagina > 1);

  // Estado vacío: sin datos y sin carga en curso.
  if (!isLoading && data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  /** Filas como tarjetas (por debajo de `md`). */
  const tarjetas = isLoading ? (
    Array.from({ length: 5 }).map((_, i) => (
      <div key={`sk-card-${i}`} className="space-y-2 rounded-lg border border-border bg-card p-4">
        {columns.map((_col, j) => (
          <div key={j} className="h-4 w-2/3 animate-pulse rounded bg-surface-2" />
        ))}
      </div>
    ))
  ) : (
    table.getRowModel().rows.map((row) => (
      <div key={row.id} className="rounded-lg border border-border bg-card p-4">
        <dl className="space-y-2">
          {row.getVisibleCells().map((cell) => {
            const encabezado = cell.column.columnDef.header;
            // Solo los encabezados de texto sirven de etiqueta; la columna de
            // acciones no tiene y ocupa el ancho completo al pie.
            const etiqueta = typeof encabezado === "string" ? encabezado.trim() : "";

            return (
              <div
                key={cell.id}
                className={cn(
                  "flex gap-3",
                  etiqueta
                    ? "items-baseline justify-between"
                    : "justify-end border-t border-border pt-2",
                )}
              >
                {etiqueta && (
                  <dt className="shrink-0 text-2xs uppercase tracking-wider text-text-muted">
                    {etiqueta}
                  </dt>
                )}
                <dd className={cn("min-w-0 text-sm", etiqueta ? "text-right" : "w-full")}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    ))
  );

  return (
    <div className="space-y-3">
      <div className="space-y-3 md:hidden">{tarjetas}</div>

      <div className="hidden rounded-lg border border-border bg-card md:block">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Filas esqueleto mientras carga.
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {columns.map((_col, j) => (
                    <TableCell key={j}>
                      <div className="h-4 w-full max-w-[8rem] animate-pulse rounded bg-surface-2" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {hayControles && (
        <div className="flex flex-col gap-2 px-1 text-sm text-text-secondary sm:flex-row sm:items-center sm:justify-between">
          <span className="tabular-nums">
            Página {paginaActual} de {ultimaPagina}
            {meta?.total != null && ` · ${meta.total} en total`}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(paginaActual - 1)}
              disabled={paginaActual <= 1 || isLoading}
            >
              <ChevronLeft />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(paginaActual + 1)}
              disabled={paginaActual >= ultimaPagina || isLoading}
            >
              Siguiente
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export type { ColumnDef };
