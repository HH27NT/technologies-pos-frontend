import { Card } from "@/components/ui/card";
import type { ReporteDef } from "../constants";
import type { ResumenReporte } from "../types";
import { formatCelda, humanizarClave } from "../formato";

interface ReporteResumenProps {
  resumen: ResumenReporte;
  def: Pick<ReporteDef, "money" | "pct">;
}

/**
 * Tiles con las métricas de resumen del reporte. Las cifras llegan calculadas del
 * backend (regla #6): aquí solo se muestran, con `tabular-nums`.
 */
export function ReporteResumen({ resumen, def }: ReporteResumenProps) {
  const entradas = Object.entries(resumen);
  if (entradas.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {entradas.map(([clave, valor]) => (
        <Card key={clave} className="p-4">
          <p className="text-sm text-text-secondary">{humanizarClave(clave)}</p>
          <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-foreground">
            {formatCelda(clave, valor, def)}
          </p>
        </Card>
      ))}
    </div>
  );
}
