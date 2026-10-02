import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface GraficaCardProps {
  titulo: string;
  subtitulo?: string;
  cargando?: boolean;
  /** Si no hay datos, se muestra este texto en lugar del contenido. */
  vacio?: boolean;
  vacioTexto?: string;
  children: ReactNode;
  className?: string;
  /**
   * Ruta a la vista completa del ranking. Las gráficas del dashboard se recortan al
   * top 5; esto es la salida al reporte entero (`/app/reportes?tipo=…&preset=…`).
   */
  verTodo?: string;
}

/**
 * Envoltura de una gráfica del dashboard: título de sección + estados de carga y
 * vacío homogéneos. El título nombra la (única) serie, así las gráficas de una serie
 * no necesitan leyenda (guía dataviz).
 */
export function GraficaCard({
  titulo,
  subtitulo,
  cargando,
  vacio,
  vacioTexto = "Sin datos en el periodo.",
  children,
  className,
  verTodo,
}: GraficaCardProps) {
  return (
    <div className={`rounded-lg border border-border bg-card p-4 ${className ?? ""}`}>
      <div className="mb-3 flex items-start justify-between gap-2">
        {/* min-w-0: sin esto un título largo empuja el enlace fuera del card. */}
        <div className="min-w-0">
          <h3 className="font-display text-md text-foreground">{titulo}</h3>
          {subtitulo && <p className="text-xs text-text-muted">{subtitulo}</p>}
        </div>
        {verTodo && (
          /* El aria-label es obligatorio: varios cards repiten el texto "Ver todo" y
             sin él un lector de pantalla no distingue a cuál reporte lleva cada uno. */
          <Link
            to={verTodo}
            aria-label={`Ver todo: ${titulo}`}
            className="-my-1 -mr-1 shrink-0 rounded-sm p-1 text-sm text-brand-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Ver todo →
          </Link>
        )}
      </div>
      {cargando ? (
        <div className="h-56 animate-pulse rounded-lg bg-surface-2" />
      ) : vacio ? (
        <div className="grid h-56 place-items-center text-sm text-text-muted">{vacioTexto}</div>
      ) : (
        children
      )}
    </div>
  );
}
