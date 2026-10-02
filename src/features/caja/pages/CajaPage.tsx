import { useEffect, useMemo, useState } from "react";
import { LockKeyholeOpen, Wallet } from "lucide-react";
import {
  PageHeader,
  DataTable,
  EmptyState,
  ErrorState,
  PermissionGate,
  type ColumnDef,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/auth";
import { formatMoney, toNumber, formatFechaHora } from "@/lib/format";
import { useCajaActual, useHistoricoCaja } from "../api";
import { AbrirCajaDialog } from "../components/AbrirCajaDialog";
import { CerrarCajaDialog } from "../components/CerrarCajaDialog";
import type { CajaSesion } from "../types";

/**
 * Pantalla de Caja (M10). Muestra la sesión de caja abierta (o su ausencia) con
 * las acciones de abrir/cerrar según permiso, y el histórico paginado de sesiones.
 * La sesión de caja gobierna la compuerta del POS (regla #5): se sincroniza el
 * store con lo que devuelve `GET /caja/actual`.
 */
export function CajaPage() {
  const [page, setPage] = useState(1);
  const [abrirOpen, setAbrirOpen] = useState(false);
  const [cerrarOpen, setCerrarOpen] = useState(false);

  const setCajaAbierta = useAuthStore((s) => s.setCajaAbierta);
  const actualQuery = useCajaActual();
  const historicoQuery = useHistoricoCaja({ page });

  const sesion = actualQuery.data ?? null;

  // Mantiene la compuerta del POS alineada con el estado real del backend.
  useEffect(() => {
    if (actualQuery.isSuccess) setCajaAbierta(sesion !== null);
  }, [actualQuery.isSuccess, sesion, setCajaAbierta]);

  const columns = useMemo<ColumnDef<CajaSesion, unknown>[]>(
    () => [
      {
        header: "Apertura",
        cell: ({ row }) => (
          <span className="text-text-secondary">
            {formatFechaHora(row.original.abierta_at)}
          </span>
        ),
      },
      {
        header: "Cierre",
        cell: ({ row }) => (
          <span className="text-text-secondary">
            {row.original.cerrada_at ? formatFechaHora(row.original.cerrada_at) : "—"}
          </span>
        ),
      },
      {
        header: "Inicial",
        cell: ({ row }) => (
          <span className="tabular-nums">{formatMoney(row.original.monto_inicial)}</span>
        ),
      },
      {
        header: "Sistema",
        cell: ({ row }) => (
          <span className="tabular-nums text-text-secondary">
            {row.original.monto_sistema != null
              ? formatMoney(row.original.monto_sistema)
              : "—"}
          </span>
        ),
      },
      {
        header: "Contado",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.monto_contado != null
              ? formatMoney(row.original.monto_contado)
              : "—"}
          </span>
        ),
      },
      {
        header: "Diferencia",
        cell: ({ row }) => {
          const { diferencia } = row.original;
          if (diferencia == null) return <span className="text-text-muted">—</span>;
          const n = toNumber(diferencia);
          const color =
            n < 0 ? "text-danger" : n > 0 ? "text-success" : "text-text-secondary";
          return <span className={`tabular-nums ${color}`}>{formatMoney(diferencia)}</span>;
        },
      },
      {
        header: "Estado",
        cell: ({ row }) =>
          row.original.estado === "abierta" ? (
            <Badge variant="success">Abierta</Badge>
          ) : (
            <Badge variant="secondary">Cerrada</Badge>
          ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Caja"
        description="Abre y cierra la caja del turno y consulta el histórico de sesiones."
        actions={
          sesion ? (
            <PermissionGate permiso="caja.cerrar">
              <Button variant="destructive" onClick={() => setCerrarOpen(true)}>
                Cerrar caja
              </Button>
            </PermissionGate>
          ) : (
            <PermissionGate permiso="caja.abrir">
              <Button onClick={() => setAbrirOpen(true)}>
                <LockKeyholeOpen />
                Abrir caja
              </Button>
            </PermissionGate>
          )
        }
      />

      {/* Estado actual de la caja */}
      {actualQuery.isError ? (
        <ErrorState error={actualQuery.error} onRetry={() => actualQuery.refetch()} />
      ) : actualQuery.isLoading ? (
        <div className="h-28 animate-pulse rounded-lg border border-border bg-surface-2" />
      ) : sesion ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="size-5 text-success" />
              <span className="font-display text-lg">Caja abierta</span>
            </div>
            <Badge variant="success">Abierta</Badge>
          </div>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-text-muted">Monto inicial</dt>
              <dd className="mt-1 font-display text-xl tabular-nums">
                {formatMoney(sesion.monto_inicial)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-text-muted">Apertura</dt>
              <dd className="mt-1">{formatFechaHora(sesion.abierta_at)}</dd>
            </div>
            <div>
              <dt className="text-sm text-text-muted">Abierta por</dt>
              <dd className="mt-1">{sesion.usuario_apertura?.nombre ?? "—"}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <EmptyState
          title="No hay caja abierta"
          description="Abre la caja para habilitar las ventas del POS en este turno."
          action={
            <PermissionGate permiso="caja.abrir">
              <Button onClick={() => setAbrirOpen(true)}>
                <LockKeyholeOpen />
                Abrir caja
              </Button>
            </PermissionGate>
          }
        />
      )}

      {/* Histórico de sesiones */}
      <div className="mt-8 space-y-3">
        <h2 className="font-display text-lg">Histórico de sesiones</h2>
        {historicoQuery.isError ? (
          <ErrorState
            error={historicoQuery.error}
            onRetry={() => historicoQuery.refetch()}
          />
        ) : (
          <DataTable
            columns={columns}
            data={historicoQuery.data?.data ?? []}
            meta={historicoQuery.data?.meta}
            page={page}
            onPageChange={setPage}
            isLoading={historicoQuery.isLoading}
            emptyState={
              <EmptyState
                title="Aún no hay sesiones"
                description="Cuando abras y cierres caja, las sesiones aparecerán aquí."
              />
            }
          />
        )}
      </div>

      <AbrirCajaDialog open={abrirOpen} onOpenChange={setAbrirOpen} />
      {sesion && (
        <CerrarCajaDialog open={cerrarOpen} onOpenChange={setCerrarOpen} sesion={sesion} />
      )}
    </>
  );
}
