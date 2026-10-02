import { useState } from "react";
import { Minus, Plus, Receipt, Send, Ticket, Trash2, UserCog, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { useCan } from "@/lib/auth";
import { CobrarDialog } from "@/features/pagos";
import {
  TicketPreviewDialog,
  useEmitirTicket,
  type Ticket as TicketEmitido,
} from "@/features/tickets";
import { OverrideAutorizacionDialog } from "@/features/autorizaciones";
import { tipoOrdenLabel } from "../constants";
import { meseroDeOrden } from "../atribucion";
import {
  useAnularOrden,
  useCancelarItem,
  useEditarItem,
  useEnviarComanda,
} from "../api";
import { DescuentoDialog } from "./DescuentoDialog";
import { ReasignarDialog } from "./ReasignarDialog";
import type { ItemOrden, Orden, SaldoOrden } from "../types";

interface TicketPanelProps {
  orden: Orden;
  saldo?: SaldoOrden;
  cajaAbierta: boolean;
  /** Se llama tras anular, para volver a la lista. */
  onAnulada?: () => void;
}

/**
 * Panel del ticket de la orden (M11): ítems, totales congelados del backend y
 * acciones. Las escrituras del ciclo de venta (editar cantidad, comanda, descuento)
 * se deshabilitan sin caja abierta (regla #5). Cancelar ítem / anular NO dependen de
 * la caja (acción de admin); si el usuario no tiene el permiso directo pero puede
 * solicitar, se abre `OverrideAutorizacionDialog`: un admin teclea su PIN y la acción
 * se ejecuta al instante, quedando registrada (M14.1, metodo=override). Si no hay
 * admin cerca, ese mismo diálogo ofrece dejar la solicitud en la bandeja.
 */
export function TicketPanel({ orden, saldo, cajaAbierta, onAnulada }: TicketPanelProps) {
  const [descuentoOpen, setDescuentoOpen] = useState(false);
  const [porCancelar, setPorCancelar] = useState<ItemOrden | undefined>();
  const [porSolicitarCancelar, setPorSolicitarCancelar] = useState<ItemOrden | undefined>();
  const [anularOpen, setAnularOpen] = useState(false);
  const [solicitarAnularOpen, setSolicitarAnularOpen] = useState(false);
  const [reasignarOpen, setReasignarOpen] = useState(false);
  const [cobrarOpen, setCobrarOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [ticketActual, setTicketActual] = useState<TicketEmitido | undefined>();

  const puedeAgregar = useCan("ordenes.agregar_item");
  const puedeDescuento = useCan("ordenes.aplicar_descuento");
  const puedeCancelarItem = useCan("ordenes.cancelar_item");
  const puedeAnular = useCan("ordenes.anular");
  const puedeReasignar = useCan("ordenes.reasignar");
  const puedeCobrar = useCan("ordenes.cobrar");
  const puedeImprimirTicket = useCan("tickets.imprimir");
  const puedeSolicitar = useCan("autorizaciones.solicitar");

  const editarItem = useEditarItem();
  const cancelarItem = useCancelarItem();
  const enviarComanda = useEnviarComanda();
  const anularOrden = useAnularOrden();
  const emitirTicket = useEmitirTicket();

  const abierta = orden.estado === "abierta";
  const pagada = orden.estado === "pagada";
  const detalles = orden.detalles ?? [];
  const activos = detalles.filter((d) => d.estado_item === "activo");
  const hayPendientes = activos.some((d) => !d.enviado);
  const saldoPendiente = saldo?.saldo ?? Number(orden.total);

  function emitir() {
    emitirTicket.mutate(orden.id, {
      onSuccess: (t) => {
        setTicketActual(t);
        setPreviewOpen(true);
      },
    });
  }
  // Escrituras del ciclo de venta: exigen caja + orden abierta + permiso.
  const puedeEscribir = cajaAbierta && abierta && puedeAgregar;

  function cambiarCantidad(item: ItemOrden, delta: number) {
    const nueva = Math.round(Number(item.cantidad)) + delta;
    if (nueva < 1) return;
    editarItem.mutate({ idOrden: orden.id, idItem: item.id, cantidad: nueva });
  }

  const mutando =
    editarItem.isPending || cancelarItem.isPending || enviarComanda.isPending;

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-surface-1">
      {/* Encabezado */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border p-3 sm:p-4">
        {/* min-w-0 + truncate: nombres largos de mesa o de mesero no deben
            estirar el panel (en teléfono se lleva el ancho de la pantalla). */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Ticket className="size-5 shrink-0 text-primary" />
            <span className="truncate font-display text-lg">Orden {orden.folio}</span>
          </div>
          <p className="mt-0.5 truncate text-sm text-text-secondary">
            {tipoOrdenLabel(orden.id_tipo_orden)}
            {orden.mesa ? ` · ${orden.mesa.nombre ?? `Mesa ${orden.mesa.numero}`}` : ""}
          </p>
          {meseroDeOrden(orden) && (
            <p className="mt-0.5 truncate text-xs text-text-muted">
              Atiende: {meseroDeOrden(orden)!.nombre}
            </p>
          )}
        </div>
        <div className="shrink-0">
          <EstadoBadge estado={orden.estado} />
        </div>
      </div>

      {/* Ítems */}
      <div className="flex-1 overflow-y-auto p-2">
        {detalles.length === 0 ? (
          <p className="p-6 text-center text-sm text-text-muted">
            Agrega productos desde el panel de la izquierda.
          </p>
        ) : (
          <ul className="space-y-1">
            {detalles.map((item) => {
              const cancelado = item.estado_item === "cancelado";
              return (
                <li
                  key={item.id}
                  className={cn(
                    // En teléfono la fila se parte: nombre completo arriba,
                    // controles y subtotal abajo. En una sola línea, los ~250px
                    // de controles fijos dejaban ~60px para el nombre y todo
                    // producto de dos palabras salía truncado.
                    "flex flex-wrap items-center gap-2 rounded-lg px-2 py-2 sm:flex-nowrap",
                    cancelado && "opacity-50",
                  )}
                >
                  <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={cn(
                          "truncate text-base font-medium",
                          cancelado && "line-through",
                        )}
                      >
                        {item.producto.nombre}
                      </span>
                      {cancelado ? (
                        <Badge variant="danger">Cancelado</Badge>
                      ) : item.enviado ? (
                        <Badge variant="secondary">Enviado</Badge>
                      ) : null}
                    </div>
                    <span className="text-sm tabular-nums text-text-muted">
                      {formatMoney(item.precio_unitario)} c/u
                    </span>
                  </div>

                  {/* Controles de cantidad (solo activos y con permiso de escritura) */}
                  {!cancelado && puedeEscribir ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-10 lg:size-8"
                        disabled={mutando || Math.round(Number(item.cantidad)) <= 1}
                        onClick={() => cambiarCantidad(item, -1)}
                        aria-label="Quitar una unidad"
                      >
                        <Minus />
                      </Button>
                      <span className="w-10 text-center text-base tabular-nums lg:w-8">
                        {Math.round(Number(item.cantidad))}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-10 lg:size-8"
                        disabled={mutando}
                        onClick={() => cambiarCantidad(item, 1)}
                        aria-label="Agregar una unidad"
                      >
                        <Plus />
                      </Button>
                    </div>
                  ) : (
                    <span className="w-10 text-center text-base tabular-nums text-text-secondary lg:w-8">
                      ×{Math.round(Number(item.cantidad))}
                    </span>
                  )}

                  {/* ml-auto: al partirse la fila en teléfono, el subtotal se
                      va al extremo derecho en vez de pegarse a los controles. */}
                  <span className="ml-auto w-20 shrink-0 text-right text-base font-medium tabular-nums sm:ml-0">
                    {formatMoney(item.subtotal)}
                  </span>

                  {/* Cancelar ítem (no depende de caja): admin directo; operador solicita. */}
                  {!cancelado && abierta && puedeCancelarItem && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-10 text-danger lg:size-8"
                      disabled={cancelarItem.isPending}
                      onClick={() => setPorCancelar(item)}
                      aria-label="Cancelar ítem"
                    >
                      <X />
                    </Button>
                  )}
                  {!cancelado && abierta && !puedeCancelarItem && puedeSolicitar && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-10 text-text-muted lg:size-8"
                      onClick={() => setPorSolicitarCancelar(item)}
                      aria-label="Cancelar ítem con autorización"
                      title="Cancelar con PIN de administrador"
                    >
                      <X />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Totales (congelados del backend). Compacto en teléfono: este bloque es
          de altura fija y cada píxel que ocupa se lo quita a la lista de ítems,
          que es la que necesita crecer. */}
      <div className="shrink-0 border-t border-border p-3 sm:p-4">
        <dl className="space-y-1 text-sm">
          <Renglon etiqueta="Subtotal" valor={orden.subtotal} />
          {Number(orden.descuento) > 0 && (
            <Renglon etiqueta="Descuento" valor={`-${orden.descuento}`} tono="danger" />
          )}
          {Number(orden.impuesto) > 0 && (
            <Renglon etiqueta="Impuesto" valor={orden.impuesto} />
          )}
          <div className="flex items-center justify-between pt-1">
            <dt className="font-display text-lg">Total</dt>
            <dd className="font-display text-xl tabular-nums sm:text-2xl">
              {formatMoney(orden.total)}
            </dd>
          </div>
          {saldo && saldo.pagado > 0 && (
            <div className="flex items-center justify-between text-text-secondary">
              <dt>Saldo</dt>
              <dd className="tabular-nums">{formatMoney(saldo.saldo)}</dd>
            </div>
          )}
        </dl>

        {/* Acciones */}
        {abierta && (
          <div className="mt-3 space-y-2 sm:mt-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                disabled={!puedeEscribir || !hayPendientes || enviarComanda.isPending}
                onClick={() => enviarComanda.mutate(orden.id)}
              >
                <Send />
                Comanda
              </Button>
              {puedeDescuento ? (
                <Button
                  variant="secondary"
                  disabled={!cajaAbierta || detalles.length === 0}
                  onClick={() => setDescuentoOpen(true)}
                >
                  Descuento
                </Button>
              ) : (
                <span />
              )}
            </div>

            {/* Cobrar (M12): exige caja abierta, permiso y algo que cobrar. */}
            {puedeCobrar && (
              <Button
                size="tap"
                // whitespace-normal: el botón base es `whitespace-nowrap`, y su
                // etiqueta lleva un monto variable. Con un total de 5 cifras en
                // una pantalla de 320px, el texto desbordaba el botón y empujaba
                // el ancho de toda la página.
                className="w-full whitespace-normal"
                disabled={!cajaAbierta || activos.length === 0 || saldoPendiente <= 0}
                onClick={() => setCobrarOpen(true)}
                title={!cajaAbierta ? "Abre la caja para poder cobrar" : undefined}
              >
                <Receipt />
                Cobrar {formatMoney(saldoPendiente)}
              </Button>
            )}

            {/* Acciones secundarias, lado a lado cuando sus etiquetas caben.
                `flex-1 min-w-[45%]` las acomoda solas: dos por fila si son
                cortas ("Reasignar mesero" / "Anular orden") y una por fila
                cuando la etiqueta es larga (las variantes con autorización),
                sin condicionales por permiso. Ahorra una fila completa de
                altura en teléfono, que es lo que le faltaba a la lista. */}
            <div className="flex flex-wrap gap-2">
              {/* Reasignar mesero (traspaso): admin/gerente, no depende de caja. */}
              {puedeReasignar && (
                <Button
                  variant="outline"
                  className="min-w-[45%] flex-1 whitespace-normal"
                  onClick={() => setReasignarOpen(true)}
                >
                  <UserCog />
                  Reasignar mesero
                </Button>
              )}

              {/* Anular: acción de admin (no depende de caja) o solicitar autorización */}
              {puedeAnular ? (
                <Button
                  variant="outline"
                  className="min-w-[45%] flex-1 whitespace-normal text-danger"
                  disabled={anularOrden.isPending}
                  onClick={() => setAnularOpen(true)}
                >
                  <Trash2 />
                  Anular orden
                </Button>
              ) : puedeSolicitar ? (
                <Button
                  variant="outline"
                  className="min-w-[45%] flex-1 whitespace-normal"
                  onClick={() => setSolicitarAnularOpen(true)}
                >
                  <Trash2 />
                  Anular con autorización de admin
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="min-w-[45%] flex-1 whitespace-normal"
                  disabled
                  title="Requiere autorización de un administrador"
                >
                  Solicitar autorización para anular
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Orden pagada: emitir ticket de cobro (M13). */}
        {pagada && puedeImprimirTicket && (
          <div className="mt-4">
            <Button
              className="w-full"
              variant="secondary"
              disabled={emitirTicket.isPending}
              onClick={emitir}
            >
              <Receipt />
              {emitirTicket.isPending ? "Emitiendo…" : "Emitir ticket"}
            </Button>
          </div>
        )}
      </div>

      {abierta && (
        <CobrarDialog
          open={cobrarOpen}
          onOpenChange={setCobrarOpen}
          orden={orden}
          saldo={saldoPendiente}
        />
      )}

      {/* Operador sin `ordenes.anular`: override con PIN de admin (o solicitud). */}
      <OverrideAutorizacionDialog
        open={solicitarAnularOpen}
        onOpenChange={setSolicitarAnularOpen}
        descripcion={`Un administrador autoriza anular la orden ${orden.folio} con su PIN.`}
        ejecutar={(autorizacion) =>
          anularOrden.mutateAsync({ idOrden: orden.id, autorizacion })
        }
        solicitud={{ tipo: "anular_orden", refs: { id_orden: orden.id } }}
        // Solo el override anula al instante; la solicitud deja la orden abierta
        // hasta que el admin la apruebe desde la bandeja.
        onAutorizada={() => onAnulada?.()}
      />

      {/* Operador sin `ordenes.cancelar_item`: override con PIN de admin (o solicitud). */}
      <OverrideAutorizacionDialog
        open={Boolean(porSolicitarCancelar)}
        onOpenChange={(o) => !o && setPorSolicitarCancelar(undefined)}
        descripcion={
          porSolicitarCancelar
            ? `Un administrador autoriza cancelar "${porSolicitarCancelar.producto.nombre}" con su PIN.`
            : undefined
        }
        ejecutar={(autorizacion) =>
          cancelarItem.mutateAsync({
            idOrden: orden.id,
            idItem: porSolicitarCancelar!.id,
            autorizacion,
          })
        }
        solicitud={
          porSolicitarCancelar
            ? {
                tipo: "cancelar_item",
                refs: { id_orden: orden.id, id_item: porSolicitarCancelar.id },
              }
            : undefined
        }
        onAutorizada={() => setPorSolicitarCancelar(undefined)}
        onSolicitada={() => setPorSolicitarCancelar(undefined)}
      />

      {ticketActual && (
        <TicketPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          ticket={ticketActual}
        />
      )}

      <DescuentoDialog open={descuentoOpen} onOpenChange={setDescuentoOpen} orden={orden} />

      {abierta && puedeReasignar && (
        <ReasignarDialog open={reasignarOpen} onOpenChange={setReasignarOpen} orden={orden} />
      )}

      <ConfirmDialog
        open={Boolean(porCancelar)}
        onOpenChange={(o) => !o && setPorCancelar(undefined)}
        title="Cancelar ítem"
        description={
          porCancelar
            ? `Se cancelará "${porCancelar.producto.nombre}" de la orden. Esta acción queda registrada.`
            : ""
        }
        confirmLabel="Cancelar ítem"
        destructive
        loading={cancelarItem.isPending}
        onConfirm={() => {
          if (!porCancelar) return;
          cancelarItem.mutate(
            { idOrden: orden.id, idItem: porCancelar.id },
            { onSuccess: () => setPorCancelar(undefined) },
          );
        }}
      />

      <ConfirmDialog
        open={anularOpen}
        onOpenChange={setAnularOpen}
        title="Anular orden"
        description={`Se anulará la orden ${orden.folio} completa. Esta acción queda registrada.`}
        confirmLabel="Anular orden"
        destructive
        loading={anularOrden.isPending}
        onConfirm={() =>
          anularOrden.mutate(
            { idOrden: orden.id },
            {
              onSuccess: () => {
                setAnularOpen(false);
                onAnulada?.();
              },
            },
          )
        }
      />
    </div>
  );
}

function Renglon({
  etiqueta,
  valor,
  tono,
}: {
  etiqueta: string;
  valor: string;
  tono?: "danger";
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-text-secondary">{etiqueta}</dt>
      <dd className={cn("tabular-nums", tono === "danger" && "text-danger")}>
        {formatMoney(valor)}
      </dd>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: Orden["estado"] }) {
  if (estado === "abierta") return <Badge variant="success">Abierta</Badge>;
  if (estado === "pagada") return <Badge variant="info">Pagada</Badge>;
  if (estado === "anulada") return <Badge variant="danger">Anulada</Badge>;
  return <Badge variant="secondary">{estado}</Badge>;
}
