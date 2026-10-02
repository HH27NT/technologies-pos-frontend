import { Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { useCan } from "@/lib/auth";
import { useReimprimirTicket } from "../api";
import type { Ticket } from "../types";

interface TicketPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: Ticket;
}

/**
 * Vista previa del ticket de cobro (M13). Renderiza el `contenido_json` que arma
 * el backend (comercio, orden, ítems, totales y pagos). La reimpresión queda
 * auditada en el backend y se gatea por `tickets.reimprimir`.
 */
export function TicketPreviewDialog({ open, onOpenChange, ticket }: TicketPreviewDialogProps) {
  const puedeReimprimir = useCan("tickets.reimprimir");
  const reimprimir = useReimprimirTicket();
  const c = ticket.contenido_json;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Ticket {ticket.folio_ticket}</DialogTitle>
        </DialogHeader>

        {/* Recibo */}
        <div className="rounded-lg border border-border bg-surface-0 p-4 font-mono text-xs text-foreground">
          <div className="text-center">
            <p className="text-sm font-semibold">{c.nombre_comercial}</p>
            {c.direccion && <p className="text-text-secondary">{c.direccion}</p>}
            {c.telefono && <p className="text-text-secondary">{c.telefono}</p>}
          </div>

          <div className="my-2 border-t border-dashed border-border" />

          <div className="flex justify-between text-text-secondary">
            <span>Ticket</span>
            <span>{c.folio_ticket}</span>
          </div>
          <div className="flex justify-between text-text-secondary">
            <span>Orden</span>
            <span>
              {c.orden.folio} · {c.orden.tipo}
              {c.orden.mesa ? ` · ${c.orden.mesa}` : ""}
            </span>
          </div>

          {c.atendio && (
            <div className="flex justify-between text-text-secondary">
              <span>Le atendió</span>
              <span>{c.atendio}</span>
            </div>
          )}

          <div className="my-2 border-t border-dashed border-border" />

          <ul className="space-y-1">
            {c.items.map((it, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="min-w-0 flex-1 truncate">
                  {it.cantidad}× {it.producto}
                </span>
                <span className="tabular-nums">{formatMoney(it.subtotal)}</span>
              </li>
            ))}
          </ul>

          <div className="my-2 border-t border-dashed border-border" />

          <Linea etiqueta="Subtotal" valor={c.totales.subtotal} />
          {c.totales.descuento > 0 && (
            <Linea etiqueta="Descuento" valor={-c.totales.descuento} />
          )}
          {c.totales.impuesto > 0 && <Linea etiqueta="Impuesto" valor={c.totales.impuesto} />}
          <div className="mt-1 flex justify-between text-sm font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatMoney(c.totales.total)}</span>
          </div>

          {c.pagos.length > 0 && (
            <>
              <div className="my-2 border-t border-dashed border-border" />
              {c.pagos.map((p, i) => (
                <Linea key={i} etiqueta={p.tipo} valor={p.monto} />
              ))}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          {puedeReimprimir && (
            <Button
              onClick={() => reimprimir.mutate(ticket.id)}
              disabled={reimprimir.isPending}
            >
              <Printer />
              {reimprimir.isPending ? "Enviando…" : "Reimprimir"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Linea({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div className="flex justify-between text-text-secondary">
      <span className="capitalize">{etiqueta}</span>
      <span className="tabular-nums">{formatMoney(valor)}</span>
    </div>
  );
}
