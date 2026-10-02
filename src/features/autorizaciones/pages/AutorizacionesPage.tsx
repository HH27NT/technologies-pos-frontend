import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import {
  PageHeader,
  DataTable,
  EmptyState,
  ErrorState,
  ConfirmDialog,
  type ColumnDef,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatFechaHora } from "@/lib/format";
import { useCan } from "@/lib/auth";
import { useAprobarAutorizacion, useAutorizaciones, useRechazarAutorizacion } from "../api";
import { tipoAutorizacionLabel } from "../constants";
import type { Autorizacion, EstadoAutorizacion, MetodoAutorizacion } from "../types";

type FiltroEstado = EstadoAutorizacion | "todas";
type FiltroMetodo = MetodoAutorizacion | "todos";

const ESTADOS: { value: FiltroEstado; label: string }[] = [
  { value: "pendiente", label: "Pendientes" },
  { value: "aprobada", label: "Aprobadas" },
  { value: "rechazada", label: "Rechazadas" },
  { value: "todas", label: "Todas" },
];

const METODOS: { value: FiltroMetodo; label: string }[] = [
  { value: "todos", label: "Todo método" },
  { value: "override", label: "Override con PIN" },
  { value: "asincrono", label: "Bandeja" },
];

/**
 * Bandeja y visor de auditoría de autorizaciones (M14 + M14.1). Lista los dos
 * caminos: el override con PIN (ya resuelto al instante) y las solicitudes
 * asíncronas, que el admin aprueba/rechaza aquí (gateado por
 * `autorizaciones.aprobar`; aprobar ejecuta la operación en el backend).
 * Filtros por estado (pendientes por defecto) y por método.
 */
export function AutorizacionesPage() {
  const [page, setPage] = useState(1);
  const [estado, setEstado] = useState<FiltroEstado>("pendiente");
  const [metodo, setMetodo] = useState<FiltroMetodo>("todos");
  const [porAprobar, setPorAprobar] = useState<Autorizacion | undefined>();
  const [porRechazar, setPorRechazar] = useState<Autorizacion | undefined>();

  const puedeAprobar = useCan("autorizaciones.aprobar");
  const query = useAutorizaciones({
    page,
    ...(estado === "todas" ? {} : { estado }),
    ...(metodo === "todos" ? {} : { metodo }),
  });
  const aprobar = useAprobarAutorizacion();
  const rechazar = useRechazarAutorizacion();

  function cambiarEstado(v: FiltroEstado) {
    setEstado(v);
    setPage(1);
  }

  function cambiarMetodo(v: FiltroMetodo) {
    setMetodo(v);
    setPage(1);
  }

  const columns = useMemo<ColumnDef<Autorizacion, unknown>[]>(
    () => [
      {
        header: "Operación",
        cell: ({ row }) => (
          <span className="font-medium text-foreground">
            {tipoAutorizacionLabel(row.original.tipo)}
          </span>
        ),
      },
      {
        header: "Solicitante",
        cell: ({ row }) => (
          <span className="text-text-secondary">{row.original.solicitante ?? "—"}</span>
        ),
      },
      {
        header: "Motivo",
        cell: ({ row }) => (
          <span className="text-text-secondary">{row.original.motivo || "—"}</span>
        ),
      },
      {
        header: "Solicitada",
        cell: ({ row }) => (
          <span className="tabular-nums text-text-secondary">
            {formatFechaHora(row.original.created_at)}
          </span>
        ),
      },
      {
        header: "Resuelta",
        cell: ({ row }) => (
          <span className="tabular-nums text-text-secondary">
            {row.original.resuelta_at ? formatFechaHora(row.original.resuelta_at) : "—"}
          </span>
        ),
      },
      {
        // El backend expone el id del autorizador, no su nombre (solo hidrata al
        // solicitante en el listado). Se muestra el id para poder rastrearlo.
        header: "Autorizó",
        cell: ({ row }) => (
          <span className="tabular-nums text-text-secondary">
            {row.original.id_usuario_autoriza ? `#${row.original.id_usuario_autoriza}` : "—"}
          </span>
        ),
      },
      {
        header: "Estado",
        cell: ({ row }) => <EstadoBadge estado={row.original.estado} />,
      },
      {
        header: "Método",
        cell: ({ row }) =>
          row.original.metodo === "override" ? (
            <Badge variant="info">PIN</Badge>
          ) : row.original.metodo === "asincrono" ? (
            <Badge variant="secondary">Bandeja</Badge>
          ) : (
            <span className="text-text-muted">—</span>
          ),
      },
      {
        id: "acciones",
        header: () => <span className="sr-only">Acciones</span>,
        cell: ({ row }) => {
          const a = row.original;
          if (!puedeAprobar || a.estado !== "pendiente") return null;
          return (
            <div className="flex justify-end gap-1">
              <Button
                variant="outline"
                size="sm"
                className="text-success"
                onClick={() => setPorAprobar(a)}
              >
                <Check />
                Aprobar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-danger"
                onClick={() => setPorRechazar(a)}
              >
                <X />
                Rechazar
              </Button>
            </div>
          );
        },
      },
    ],
    [puedeAprobar],
  );

  if (query.isError) {
    return (
      <>
        <PageHeader title="Autorizaciones" description="Solicitudes de operaciones sensibles." />
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Autorizaciones"
        description="Registro de operaciones sensibles: overrides autorizados con PIN y solicitudes de la bandeja."
        actions={
          <div className="flex gap-2">
            <Select value={estado} onValueChange={(v) => cambiarEstado(v as FiltroEstado)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS.map((e) => (
                  <SelectItem key={e.value} value={e.value}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={metodo} onValueChange={(v) => cambiarMetodo(v as FiltroMetodo)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METODOS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={query.data?.data ?? []}
        meta={query.data?.meta}
        page={page}
        onPageChange={setPage}
        isLoading={query.isLoading}
        emptyState={
          <EmptyState
            title="Sin solicitudes"
            description="No hay autorizaciones con este filtro."
          />
        }
      />

      <ConfirmDialog
        open={Boolean(porAprobar)}
        onOpenChange={(o) => !o && setPorAprobar(undefined)}
        title="Aprobar autorización"
        description={
          porAprobar
            ? `Se ejecutará "${tipoAutorizacionLabel(porAprobar.tipo)}" solicitada por ${porAprobar.solicitante ?? "el operador"}.`
            : ""
        }
        confirmLabel="Aprobar y ejecutar"
        loading={aprobar.isPending}
        onConfirm={() => {
          if (!porAprobar) return;
          aprobar.mutate(porAprobar.id, { onSuccess: () => setPorAprobar(undefined) });
        }}
      />

      <ConfirmDialog
        open={Boolean(porRechazar)}
        onOpenChange={(o) => !o && setPorRechazar(undefined)}
        title="Rechazar autorización"
        description={
          porRechazar
            ? `Se rechazará "${tipoAutorizacionLabel(porRechazar.tipo)}" solicitada por ${porRechazar.solicitante ?? "el operador"}. No se ejecutará nada.`
            : ""
        }
        confirmLabel="Rechazar"
        destructive
        loading={rechazar.isPending}
        onConfirm={() => {
          if (!porRechazar) return;
          rechazar.mutate(porRechazar.id, { onSuccess: () => setPorRechazar(undefined) });
        }}
      />
    </>
  );
}

function EstadoBadge({ estado }: { estado: EstadoAutorizacion }) {
  if (estado === "pendiente") return <Badge variant="warning">Pendiente</Badge>;
  if (estado === "aprobada") return <Badge variant="success">Aprobada</Badge>;
  return <Badge variant="danger">Rechazada</Badge>;
}
