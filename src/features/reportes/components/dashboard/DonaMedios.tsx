import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { FilaReporte } from "../../types";

/**
 * Paleta categórica validada con scripts/validate_palette.js (--mode light, superficie
 * del card): ámbar, azul, verde, morado. Pasa banda de luminosidad, piso de croma,
 * separación CVD (ΔE≈22) y visión normal. El WARN de contraste del ámbar se cubre con
 * la leyenda + los valores (identidad nunca por color solo).
 */
const PALETA = ["#E39A2B", "#3B7DD8", "#3E9E5E", "#8B5CF6"];

interface DonaMediosProps {
  filas: FilaReporte[];
  /** Clave de la categoría (medio) y del valor (monto). */
  nombreKey: string;
  valorKey: string;
  formato: (v: number) => string;
}

interface Rebanada {
  name: string;
  value: number;
}

/**
 * Proporción por medio de pago (dona, pocas categorías = parte-de-un-todo). Anillo de
 * 2px del color de superficie entre rebanadas; leyenda con el monto y la participación
 * de cada medio.
 *
 * La leyenda va DEBAJO de la dona, no al lado: el card mide un tercio de la rejilla
 * (~340px), y en fila la leyenda se quedaba con ~150px — no alcanzaban para el nombre,
 * el monto y el porcentaje sin truncar. Apilado dispone del ancho completo del card.
 */
export function DonaMedios({ filas, nombreKey, valorKey, formato }: DonaMediosProps) {
  const data: Rebanada[] = filas
    .map((f) => ({ name: String(f[nombreKey] ?? "—"), value: Number(f[valorKey] ?? 0) }))
    .filter((d) => Number.isFinite(d.value) && d.value > 0);

  if (data.length === 0) return null;

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="h-40 w-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="58%"
              outerRadius="100%"
              paddingAngle={2}
              stroke="var(--surface-1)"
              strokeWidth={2}
            >
              {data.map((d, i) => (
                <Cell key={d.name} fill={PALETA[i % PALETA.length]} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) =>
                active && payload && payload.length ? (
                  <div className="rounded-lg border border-border bg-card p-2 text-xs shadow-sm">
                    <p className="font-medium capitalize text-foreground">{payload[0].name}</p>
                    <p className="tabular-nums text-text-secondary">
                      {formato(Number(payload[0].value))}
                    </p>
                  </div>
                ) : null
              }
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="w-full max-w-xs space-y-1.5 text-sm">
        {data.map((d, i) => {
          const pct = (d.value / total) * 100;
          return (
            <li key={d.name} className="flex items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: PALETA[i % PALETA.length] }}
              />
              <span className="min-w-0 flex-1 truncate capitalize text-text-secondary">{d.name}</span>
              <span className="tabular-nums font-medium text-foreground">{formato(d.value)}</span>
              <span className="w-10 shrink-0 text-right tabular-nums text-text-muted">
                {pct < 1 ? "<1%" : `${Math.round(pct)}%`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
