import {
  Bar,
  BarChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FilaReporte } from "../../types";

interface BarraHorizontalProps {
  filas: FilaReporte[];
  /** Clave categórica (nombre) y clave numérica (magnitud). */
  x: string;
  y: string;
  /** Formatea la magnitud (dinero o número) para etiqueta y tooltip. */
  formato: (v: number) => string;
  /** Sufijo opcional por fila (p. ej. la unidad del insumo). */
  sufijo?: (fila: FilaReporte) => string;
  altura?: number;
}

interface Punto {
  label: string;
  valor: number;
  sufijo: string;
}

/**
 * Ranking de categorías con nombre (barras horizontales, una serie): la forma correcta
 * para comparar magnitudes entre etiquetas largas (guía dataviz; nunca un pastel). Color
 * de marca vía `--primary`; extremo redondeado; etiqueta de valor directa a la derecha.
 */
export function BarraHorizontal({ filas, x, y, formato, sufijo, altura }: BarraHorizontalProps) {
  // Igual que en `ReporteChart`: un valor nulo es "no se sabe", no cero. Pintarlo a
  // ras del eje —y con su etiqueta "$0.00" al lado— afirmaría una medición que nadie
  // hizo. Se omite la fila.
  const data: Punto[] = filas
    .filter((f) => f[y] != null)
    .map((f) => ({
      label: String(f[x] ?? "—"),
      valor: Number(f[y]),
      sufijo: sufijo ? sufijo(f) : "",
    }))
    .filter((p) => Number.isFinite(p.valor));

  if (data.length === 0) return null;

  const alto = altura ?? Math.max(180, data.length * 34 + 16);

  return (
    <div style={{ height: alto }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={data} margin={{ top: 4, right: 56, bottom: 4, left: 8 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            width={128}
            tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: "var(--surface-2)", opacity: 0.4 }}
            content={({ active, payload }) =>
              active && payload && payload.length ? (
                <div className="rounded-lg border border-border bg-card p-2 text-xs shadow-sm">
                  <p className="font-medium text-foreground">{payload[0].payload.label}</p>
                  <p className="tabular-nums text-text-secondary">
                    {formato(Number(payload[0].value))}
                    {payload[0].payload.sufijo ? ` ${payload[0].payload.sufijo}` : ""}
                  </p>
                </div>
              ) : null
            }
          />
          <Bar dataKey="valor" radius={[0, 4, 4, 0]} maxBarSize={22} fill="var(--primary)">
            <LabelList
              dataKey="valor"
              position="right"
              className="tabular-nums"
              fill="var(--text-secondary)"
              fontSize={12}
              formatter={(v) => formato(Number(v))}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
