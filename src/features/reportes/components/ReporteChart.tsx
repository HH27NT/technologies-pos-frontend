import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartDef } from "../constants";
import type { FilaReporte } from "../types";

interface ReporteChartProps {
  filas: FilaReporte[];
  chart: ChartDef;
  /** Nombre legible del eje Y (encabezado de la columna). */
  etiquetaValor: string;
  /** Formatea el valor del eje Y y del tooltip (dinero o número). */
  formatoValor: (v: number) => string;
}

interface Punto {
  label: string;
  valor: number;
}

/**
 * Gráfica de barras de UNA serie (magnitud por categoría). Una sola serie no lleva
 * leyenda: el título de la sección la nombra (guía de dataviz). Colores del tema
 * vía CSS vars (`--primary`, tokens de texto/borde), así cambia solo entre claro y
 * oscuro. Marcas finas con extremo redondeado; ejes y rejilla recesivos.
 */
export function ReporteChart({ filas, chart, etiquetaValor, formatoValor }: ReporteChartProps) {
  // Un valor desconocido NO es una barra de cero: se omite. El margen manda `null`
  // cuando el costo del producto no está capturado, y dibujarlo a ras del eje decía
  // "este producto no deja utilidad" sobre un dato que nadie midió.
  const data: Punto[] = filas
    .filter((f) => f[chart.y] != null)
    .map((f) => ({ label: String(f[chart.x] ?? "—"), valor: Number(f[chart.y]) }))
    .filter((p) => Number.isFinite(p.valor));

  // Sin un solo valor conocido no hay gráfica que dibujar: unos ejes vacíos se leen
  // como una medición de ceros.
  if (data.length === 0) return null;

  return (
    <div className="h-72 w-full rounded-lg border border-border p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={72}
            tickFormatter={(v: number) => formatoValor(v)}
          />
          <Tooltip
            cursor={{ fill: "var(--surface-2)", opacity: 0.4 }}
            content={({ active, payload, label }) =>
              active && payload && payload.length ? (
                <div className="rounded-lg border border-border bg-card p-2 text-xs shadow-sm">
                  <p className="font-medium text-foreground">{label}</p>
                  <p className="tabular-nums text-text-secondary">
                    {etiquetaValor}: {formatoValor(Number(payload[0].value))}
                  </p>
                </div>
              ) : null
            }
          />
          <Bar
            dataKey="valor"
            fill="var(--primary)"
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
            name={etiquetaValor}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
