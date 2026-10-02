import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorState } from "@/components/shared";
import { useAuthStore, useCan } from "@/lib/auth";
import { formatMoney, formatHora } from "@/lib/format";
import { useTerminalStore } from "@/features/terminal/store";
import { tipoOrdenLabel } from "../constants";
import { esOrdenDe, meseroDeOrden } from "../atribucion";
import { useOrdenes } from "../api";
import { NuevaOrdenDialog } from "../components/NuevaOrdenDialog";
import type { Orden } from "../types";

/**
 * Landing del POS (M11): órdenes abiertas del turno + alta de nueva orden. Sin caja
 * abierta, crear orden se deshabilita (compuerta del POS, regla #5). Tocar una orden
 * abre su ticket de trabajo.
 */
export function PosPage() {
  const [nuevaOpen, setNuevaOpen] = useState(false);
  const navigate = useNavigate();

  const cajaAbierta = useAuthStore((s) => s.cajaAbierta);
  const cuentaId = useAuthStore((s) => s.usuario?.id);
  // En terminal compartida "mis órdenes" son las del mesero firmado, no las de la
  // cuenta de la tablet (que son todas).
  const meseroActivo = useTerminalStore((s) => s.mesero);
  const personaId = meseroActivo?.id ?? cuentaId;
  const puedeCrear = useCan("ordenes.crear");
  // El mesero no opera caja: por eso su vista arranca en "mis órdenes". El cajero/admin
  // (con caja.abrir) ve todas por defecto para poder cobrar cualquiera. Default por
  // permiso, no por rol (regla #3); el usuario puede cambiarlo con el toggle.
  const puedeCaja = useCan("caja.abrir");
  const [soloMias, setSoloMias] = useState(() => !puedeCaja);
  const ordenesQuery = useOrdenes({ per_page: 100 });

  const ordenes = ordenesQuery.data?.data ?? [];
  const abiertas = ordenes.filter((o) => o.estado === "abierta");
  const visibles =
    soloMias && personaId != null
      ? abiertas.filter((o) => esOrdenDe(o, personaId))
      : abiertas;

  function irAOrden(orden: Orden) {
    navigate(`/pos/ordenes/${orden.id}`);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl">Órdenes abiertas</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {visibles.length} en curso
          </p>
        </div>
        {puedeCrear && (
          <Button
            onClick={() => setNuevaOpen(true)}
            disabled={!cajaAbierta}
            title={cajaAbierta ? undefined : "Abre la caja para crear órdenes"}
          >
            <Plus />
            Nueva orden
          </Button>
        )}
      </div>

      {abiertas.length > 0 && (
        <div
          className="mt-4 inline-flex rounded-lg border border-border bg-surface-1 p-0.5"
          role="group"
          aria-label="Filtrar órdenes"
        >
          <Button
            type="button"
            variant={soloMias ? "secondary" : "ghost"}
            size="sm"
            aria-pressed={soloMias}
            onClick={() => setSoloMias(true)}
          >
            Mis órdenes
          </Button>
          <Button
            type="button"
            variant={soloMias ? "ghost" : "secondary"}
            size="sm"
            aria-pressed={!soloMias}
            onClick={() => setSoloMias(false)}
          >
            Todas
          </Button>
        </div>
      )}

      {!cajaAbierta && (
        <div className="mt-4 rounded-lg border border-border bg-danger-bg px-4 py-3 text-sm text-danger">
          La caja está cerrada. Ábrela para crear órdenes y cobrar.
        </div>
      )}

      <div className="mt-6">
        {ordenesQuery.isError ? (
          <ErrorState error={ordenesQuery.error} onRetry={() => ordenesQuery.refetch()} />
        ) : ordenesQuery.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-surface-2" />
            ))}
          </div>
        ) : visibles.length === 0 ? (
          soloMias && abiertas.length > 0 ? (
            <EmptyState
              title="No tienes órdenes abiertas"
              description="No hay cuentas asignadas a ti en este turno."
              action={
                <Button variant="outline" onClick={() => setSoloMias(false)}>
                  Ver todas
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="No hay órdenes abiertas"
              description="Crea una nueva orden para comenzar a vender."
              action={
                puedeCrear ? (
                  <Button onClick={() => setNuevaOpen(true)} disabled={!cajaAbierta}>
                    <Plus />
                    Nueva orden
                  </Button>
                ) : undefined
              }
            />
          )
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {visibles.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => irAOrden(o)}
                className="flex min-h-tap flex-col justify-between rounded-xl border border-border bg-surface-1 p-4 text-left transition-colors hover:border-primary hover:bg-surface-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-lg">{o.folio}</span>
                  <Badge variant="success">Abierta</Badge>
                </div>
                <span className="mt-1 text-sm text-text-secondary">
                  {tipoOrdenLabel(o.id_tipo_orden)}
                  {o.mesa ? ` · ${o.mesa.nombre ?? `Mesa ${o.mesa.numero}`}` : ""}
                </span>
                {!soloMias && meseroDeOrden(o) && (
                  <span className="mt-0.5 text-xs text-text-muted">
                    Atendió: {meseroDeOrden(o)!.nombre}
                  </span>
                )}
                <div className="mt-3 flex items-end justify-between">
                  <span className="text-xs text-text-muted">{formatHora(o.abierta_at)}</span>
                  <span className="font-display text-xl tabular-nums">
                    {formatMoney(o.total)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <NuevaOrdenDialog open={nuevaOpen} onOpenChange={setNuevaOpen} onCreated={irAOrden} />
    </div>
  );
}
