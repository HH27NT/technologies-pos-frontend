import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type TonoEstado = "activo" | "inactivo" | "nuevo";

const CLASES: Record<TonoEstado, string> = {
  activo: "bg-success-bg text-success",
  inactivo: "bg-danger-bg text-danger",
  nuevo: "bg-warning-bg text-warning",
};

/**
 * Pastilla de estado (activo/inactivo/nuevo). Estilo único del panel de inicio,
 * compartido para que la lista de establecimientos y la portada se vean igual.
 */
export function EstadoPill({ tono, children }: { tono: TonoEstado; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
        CLASES[tono],
      )}
    >
      {children}
    </span>
  );
}
