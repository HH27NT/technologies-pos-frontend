import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared";
import { cn } from "@/lib/utils";
import type { ReporteDef } from "../constants";
import type { FilaReporte } from "../types";
import { esNumerica, formatCelda } from "../formato";

interface ReporteTablaProps {
  columnas: string[];
  filas: FilaReporte[];
  def: Pick<ReporteDef, "money" | "pct">;
}

/**
 * Tabla genérica de reporte. Empareja `columnas[i]` (encabezado legible) con el
 * i-ésimo valor de cada fila —el backend garantiza el mismo orden—, así el mismo
 * componente sirve para los 7 reportes. Los números se alinean a la derecha con
 * `tabular-nums`. Sin paginación: el reporte llega completo.
 */
export function ReporteTabla({ columnas, filas, def }: ReporteTablaProps) {
  if (filas.length === 0) {
    return (
      <EmptyState
        title="Sin datos en el periodo"
        description="No hay registros para el rango seleccionado."
      />
    );
  }

  const keys = Object.keys(filas[0]);

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            {columnas.map((col, i) => (
              <TableHead
                key={col}
                className={cn(alineacionCabecera(keys[i], filas, def))}
              >
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.map((fila, idx) => (
            <TableRow key={idx}>
              {keys.map((key) => {
                const valor = fila[key];
                const numerica = esNumerica(key, valor, def);
                return (
                  <TableCell
                    key={key}
                    className={cn(
                      numerica ? "text-right tabular-nums text-foreground" : "text-text-secondary",
                    )}
                  >
                    {formatCelda(key, valor, def)}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** La cabecera se alinea como su columna (derecha si es numérica). */
function alineacionCabecera(
  key: string | undefined,
  filas: FilaReporte[],
  def: Pick<ReporteDef, "money" | "pct">,
): string {
  if (!key) return "";
  return esNumerica(key, filas[0]?.[key] ?? null, def) ? "text-right" : "";
}
