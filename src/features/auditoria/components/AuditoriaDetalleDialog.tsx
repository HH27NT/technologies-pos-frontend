import { ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatFechaHora } from "@/lib/format";
import { etiquetaCampo, fraseAccion, formatValorAuditoria } from "../formato";
import type { RegistroAuditoria, SnapshotAuditoria } from "../types";

interface AuditoriaDetalleDialogProps {
  registro?: RegistroAuditoria;
  /** Etiqueta de la entidad afectada (nombre para insumos/productos, si no "Entidad #id"). */
  entidadLabel?: string;
  /** Formatea el valor de un campo (resuelve referencias como id_insumo → nombre). */
  formatValor?: (campo: string, valor: unknown) => string;
  onOpenChange: (open: boolean) => void;
}

/** ¿Es un objeto plano (no arreglo ni null)? Solo esos se muestran como diff. */
function esObjeto(x: SnapshotAuditoria): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

interface Fila {
  campo: string;
  antes?: unknown;
  despues?: unknown;
  /** "cambio" muestra antes → después; "valor" muestra un único valor. */
  tipo: "cambio" | "valor";
}

/** Deriva las filas legibles del snapshot: diff en ediciones, lista en altas/bajas. */
function filasDe(registro: RegistroAuditoria): { titulo: string; filas: Fila[] } {
  const antes = esObjeto(registro.datos_antes) ? registro.datos_antes : null;
  const despues = esObjeto(registro.datos_despues) ? registro.datos_despues : null;

  if (antes && despues) {
    const claves = [...new Set([...Object.keys(antes), ...Object.keys(despues)])];
    const filas = claves
      .filter((k) => JSON.stringify(antes[k]) !== JSON.stringify(despues[k]))
      .map<Fila>((k) => ({ campo: k, antes: antes[k], despues: despues[k], tipo: "cambio" }));
    return { titulo: "Cambios", filas };
  }
  if (despues) {
    return {
      titulo: "Valores registrados",
      filas: Object.entries(despues).map(([campo, valor]) => ({ campo, despues: valor, tipo: "valor" })),
    };
  }
  if (antes) {
    return {
      titulo: "Valores anteriores",
      filas: Object.entries(antes).map(([campo, valor]) => ({ campo, antes: valor, tipo: "valor" })),
    };
  }
  return { titulo: "", filas: [] };
}

/**
 * Detalle de un registro de auditoría (M15): metadatos + un resumen legible de qué
 * cambió (antes → después), en vez del JSON crudo. El JSON técnico queda disponible
 * en un desplegable para quien lo necesite.
 */
export function AuditoriaDetalleDialog({
  registro,
  entidadLabel,
  formatValor,
  onOpenChange,
}: AuditoriaDetalleDialogProps) {
  const fmt = formatValor ?? ((_campo: string, valor: unknown) => formatValorAuditoria(valor));
  const { titulo, filas } = registro
    ? filasDe(registro)
    : { titulo: "", filas: [] as Fila[] };
  const hayDatos =
    registro?.datos_antes != null || registro?.datos_despues != null;

  return (
    <Dialog open={Boolean(registro)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {registro && (
          <>
            <DialogHeader>
              <DialogTitle>
                {registro.usuario ?? "Sistema"} {fraseAccion(registro.accion, registro.entidad)}
              </DialogTitle>
              <DialogDescription>
                {entidadLabel ??
                  `${registro.entidad}${registro.entidad_id != null ? ` #${registro.entidad_id}` : ""}`}
                {" · "}
                {formatFechaHora(registro.created_at)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-sm">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                <Dato label="Usuario" valor={registro.usuario ?? "—"} />
                <Dato label="IP" valor={registro.ip ?? "—"} />
                <Dato label="Registro" valor={`#${registro.id}`} />
              </dl>

              {filas.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
                    {titulo}
                  </p>
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {filas.map((f) => (
                      <li key={f.campo} className="flex items-center justify-between gap-3 px-3 py-2">
                        <span className="text-text-secondary">{etiquetaCampo(f.campo)}</span>
                        {f.tipo === "cambio" ? (
                          <span className="flex items-center gap-2 text-right">
                            <span className="text-text-muted line-through">
                              {fmt(f.campo, f.antes)}
                            </span>
                            <ArrowRight className="size-3.5 shrink-0 text-text-muted" />
                            <span className="font-medium text-foreground">
                              {fmt(f.campo, f.despues)}
                            </span>
                          </span>
                        ) : (
                          <span className="font-medium text-foreground">
                            {fmt(f.campo, f.despues ?? f.antes)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-text-secondary">
                  {hayDatos ? "Sin cambios en los datos." : "Esta acción no registró datos."}
                </p>
              )}

              {hayDatos && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-text-muted hover:text-text-secondary">
                    Ver datos técnicos
                  </summary>
                  <pre className="mt-2 max-h-56 overflow-auto rounded-lg border border-border bg-surface-2 p-3">
                    {JSON.stringify(
                      { antes: registro.datos_antes, despues: registro.datos_despues },
                      null,
                      2,
                    )}
                  </pre>
                </details>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <dt className="text-text-secondary">{label}</dt>
      <dd className="font-medium text-foreground">{valor}</dd>
    </div>
  );
}
