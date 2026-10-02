import { Activity, Plus, Power, UserPlus, Pencil, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativo } from "@/lib/format";
import type { RegistroAuditoria } from "../types";

/**
 * Feed de actividad de plataforma: traduce cada registro de auditoría de
 * establecimientos a una frase legible con icono ("Super admin activó Bar X"),
 * en vez de la tabla cruda. Se usa tanto en el panel de inicio como en la vista
 * "Plataforma" de la página de Auditoría, para que se vean iguales.
 */

interface DescripcionEvento {
  verbo: string;
  Icon: LucideIcon;
  /** Clases del contenedor del icono (fondo + color). */
  tono: string;
}

/** Traduce el `accion` crudo del backend a una frase legible + icono. */
const EVENTOS: Record<string, DescripcionEvento> = {
  "establecimiento.creado": { verbo: "creó", Icon: Plus, tono: "bg-success-bg text-success" },
  "establecimiento.actualizado": {
    verbo: "actualizó",
    Icon: Pencil,
    tono: "bg-surface-2 text-text-muted",
  },
  "establecimiento.activado": { verbo: "activó", Icon: Power, tono: "bg-success-bg text-success" },
  "establecimiento.desactivado": {
    verbo: "desactivó",
    Icon: Power,
    tono: "bg-danger-bg text-danger",
  },
  "establecimiento.admin_asignado": {
    verbo: "asignó un administrador a",
    Icon: UserPlus,
    tono: "bg-warning-bg text-warning",
  },
};

function describirEvento(r: RegistroAuditoria): DescripcionEvento {
  return (
    EVENTOS[r.accion] ?? { verbo: r.accion, Icon: Activity, tono: "bg-surface-2 text-text-muted" }
  );
}

/**
 * Nombre del establecimiento de un registro. Prioridad:
 *   1. la lista viva (nombre actual, aunque el snapshot no lo traiga),
 *   2. el snapshot del propio registro (`datos_despues`/`datos_antes`),
 *   3. "#id" como último recurso.
 */
function nombreEstablecimiento(r: RegistroAuditoria, nombres: Map<number, string>): string {
  if (r.entidad_id != null) {
    const vivo = nombres.get(r.entidad_id);
    if (vivo) return vivo;
  }
  const fuente = r.datos_despues ?? r.datos_antes;
  if (fuente && typeof fuente === "object" && !Array.isArray(fuente)) {
    const nombre = (fuente as Record<string, unknown>).nombre;
    if (typeof nombre === "string" && nombre.trim()) return nombre;
  }
  return r.entidad_id != null ? `#${r.entidad_id}` : "un establecimiento";
}

interface ActividadFeedProps {
  registros: RegistroAuditoria[];
  /** Índice id → nombre para resolver activar/desactivar (cuyo snapshot no trae nombre). */
  nombres: Map<number, string>;
}

export function ActividadFeed({ registros, nombres }: ActividadFeedProps) {
  return (
    <ul className="divide-y divide-border">
      {registros.map((r) => {
        const ev = describirEvento(r);
        const Icono = ev.Icon;
        return (
          <li key={r.id} className="flex gap-3 px-4 py-3">
            <span
              className={cn(
                "mt-0.5 grid size-6 shrink-0 place-items-center rounded",
                ev.tono,
              )}
            >
              <Icono className="size-3.5" />
            </span>
            <div className="min-w-0 text-sm">
              <p className="text-foreground">
                <span className="font-medium">{r.usuario ?? "Sistema"}</span>{" "}
                <span className="text-text-secondary">{ev.verbo}</span>{" "}
                <span className="font-medium">{nombreEstablecimiento(r, nombres)}</span>
              </p>
              <time className="text-xs text-text-muted">{formatRelativo(r.created_at)}</time>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
