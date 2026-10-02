import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FilaReporte } from "../../types";

interface BarrasTiempoProps {
  filas: FilaReporte[];
  /** Clave temporal (eje X) y clave numérica (eje Y). */
  x: string;
  y: string;
  etiquetaValor: string;
  formato: (v: number) => string;
  altura?: number;
}

interface Punto {
  label: string;
  valor: number;
}

/**
 * Barras de una serie a lo largo del tiempo (magnitud por periodo discreto). Sin card
 * propia (la envuelve GraficaCard). Color de marca; rejilla y ejes recesivos; extremo
 * superior redondeado (guía dataviz).
 */
export function BarrasTiempo({ filas, x, y, etiquetaValor, formato, altura }: BarrasTiempoProps) {
  const data: Punto[] = filas
    .map((f) => ({ label: String(f[x] ?? "—"), valor: Number(f[y] ?? 0) }))
    .filter((p) => Number.isFinite(p.valor));

  if (data.length === 0) return null;

  return (
    <div style={{ height: altura ?? 224 }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis
            tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={formato}
          />
          <Tooltip
            cursor={{ fill: "var(--surface-2)", opacity: 0.4 }}
            content={({ active, payload, label }) =>
              active && payload && payload.length ? (
                <div className="rounded-lg border border-border bg-card p-2 text-xs shadow-sm">
                  <p className="font-medium text-foreground">{label}</p>
                  <p className="tabular-nums text-text-secondary">
                    {etiquetaValor}: {formato(Number(payload[0].value))}
                  </p>
                </div>
              ) : null
            }
          />
          <Bar dataKey="valor" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={44} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
