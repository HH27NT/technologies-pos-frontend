import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface KpiTileProps {
  label: string;
  /** Valor ya formateado (dinero, número, etc.). */
  valor: string;
  /** Texto secundario opcional (contexto o comparación). */
  hint?: string;
  icon?: ReactNode;
  /** Tono del valor: neutro por defecto, o de alerta/éxito. */
  tono?: "default" | "danger" | "success";
  cargando?: boolean;
}

/**
 * Stat tile del dashboard: un titular numérico, sin gráfica (guía dataviz: cuando el
 * trabajo del dato es "un número", es un tile, no un chart). Cifra con numerales
 * tabulares y tipografía de display.
 */
export function KpiTile({ label, valor, hint, icon, tono = "default", cargando }: KpiTileProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">{label}</p>
        {icon && <span className="text-text-muted">{icon}</span>}
      </div>
      {cargando ? (
        <div className="mt-2 h-8 w-24 animate-pulse rounded bg-surface-2" />
      ) : (
        <p
          className={cn(
            "mt-1 font-display text-2xl tabular-nums",
            tono === "danger" && "text-danger",
            tono === "success" && "text-success",
            tono === "default" && "text-foreground",
          )}
        >
          {valor}
        </p>
      )}
      {hint && !cargando && <p className="mt-0.5 text-xs text-text-muted">{hint}</p>}
    </div>
  );
}
