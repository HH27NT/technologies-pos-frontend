import {
  Activity,
  Armchair,
  Boxes,
  Building2,
  NotebookText,
  Package,
  Printer,
  Scale,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Tags,
  Truck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativo } from "@/lib/format";
import { fraseAccion } from "../formato";
import type { RegistroAuditoria } from "../types";

/**
 * Feed de actividad genérico del ledger de auditoría (M15): traduce cada registro a
 * una frase legible con icono ("Ana registró una entrada de inventario"), en vez de
 * la tabla cruda. Cada fila abre el detalle. Sirve para el tenant y para el global.
 */

/** Icono por recurso (primer segmento de la acción, p. ej. "inventario.entrada"). */
const ICONO_RECURSO: Record<string, LucideIcon> = {
  usuario: Users,
  inventario: Boxes,
  insumo: Boxes,
  orden: ShoppingCart,
  caja: Wallet,
  ticket: Printer,
  autorizacion: ShieldCheck,
  configuracion: Settings,
  establecimiento: Building2,
  producto: Package,
  categoria: Tags,
  proveedor: Truck,
  mesa: Armchair,
  receta: NotebookText,
  impresora: Printer,
  unidad: Scale,
};

/** Eventos (segundo segmento) que dan un tono positivo o negativo al icono. */
const EVENTOS_EXITO = new Set([
  "creado", "creada", "activado", "activada", "aprobada", "entrada", "pagada", "abierta",
]);
const EVENTOS_PELIGRO = new Set([
  "desactivado", "desactivada", "eliminado", "eliminada", "anulada", "anulado",
  "cancelado", "item_cancelado", "rechazada", "merma",
]);
const EVENTOS_AVISO = new Set(["override", "solicitada", "acceso_restablecido", "admin_asignado"]);

function partesAccion(accion: string): { recurso: string; evento: string } {
  const punto = accion.indexOf(".");
  if (punto === -1) return { recurso: accion, evento: "" };
  return { recurso: accion.slice(0, punto), evento: accion.slice(punto + 1) };
}

function tonoEvento(evento: string): string {
  if (EVENTOS_EXITO.has(evento)) return "bg-success-bg text-success";
  if (EVENTOS_PELIGRO.has(evento)) return "bg-danger-bg text-danger";
  if (EVENTOS_AVISO.has(evento)) return "bg-warning-bg text-warning";
  return "bg-surface-2 text-text-muted";
}

interface AuditoriaFeedProps {
  registros: RegistroAuditoria[];
  onSelect: (registro: RegistroAuditoria) => void;
  /** Etiqueta de la entidad afectada (nombre para insumos/productos, si no "Entidad #id"). */
  etiquetaDe: (registro: RegistroAuditoria) => string;
  /** Muestra el id del establecimiento (vista global del super_admin). */
  mostrarEstablecimiento?: boolean;
}

export function AuditoriaFeed({
  registros,
  onSelect,
  etiquetaDe,
  mostrarEstablecimiento,
}: AuditoriaFeedProps) {
  return (
    <ul className="divide-y divide-border">
      {registros.map((r) => {
        const { recurso, evento } = partesAccion(r.accion);
        const Icono = ICONO_RECURSO[recurso] ?? Activity;
        return (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onSelect(r)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2"
            >
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full",
                  tonoEvento(evento),
                )}
              >
                <Icono className="size-4" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">
                  <span className="font-medium">{r.usuario ?? "Sistema"}</span>{" "}
                  <span className="text-text-secondary">{fraseAccion(r.accion, r.entidad)}</span>
                </p>
                <p className="truncate text-xs text-text-muted">
                  {etiquetaDe(r)}
                  {mostrarEstablecimiento && r.id_establecimiento != null
                    ? ` · Establecimiento #${r.id_establecimiento}`
                    : ""}
                  <span className="mx-1.5">·</span>
                  {formatRelativo(r.created_at)}
                </p>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
