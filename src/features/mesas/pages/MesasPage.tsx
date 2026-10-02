import { useMemo, useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import {
  PageHeader,
  DataTable,
  EmptyState,
  ErrorState,
  ConfirmDialog,
  PermissionGate,
  type ColumnDef,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCan } from "@/lib/auth";
import { useActivarMesa, useMesas } from "../api";
import { MesaFormDialog } from "../components/MesaFormDialog";
import type { MesaRecurso } from "../types";

/**
 * Pantalla de Mesas (M09). Lista paginada con alta/edición en modal y
 * activar/desactivar (con confirmación). Todo se gatea por `mesas.gestionar`.
 */
export function MesasPage() {
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<MesaRecurso | undefined>();
  const [porAlternar, setPorAlternar] = useState<MesaRecurso | undefined>();

  const puedeGestionar = useCan("mesas.gestionar");
  const mesasQuery = useMesas({ page });
  const activar = useActivarMesa();

  function abrirNuevo() {
    setEditando(undefined);
    setFormOpen(true);
  }

  function abrirEdicion(m: MesaRecurso) {
    setEditando(m);
    setFormOpen(true);
  }

  function confirmarAlternar() {
    if (!porAlternar) return;
    activar.mutate(porAlternar.id, {
      onSuccess: () => setPorAlternar(undefined),
    });
  }

  const columns = useMemo<ColumnDef<MesaRecurso, unknown>[]>(
    () => [
      {
        header: "Mesa",
        cell: ({ row }) => (
          <span className="font-medium tabular-nums text-foreground">
            {row.original.nombre ?? `Mesa ${row.original.numero}`}
          </span>
        ),
      },
      {
        header: "Número",
        cell: ({ row }) => (
          <span className="tabular-nums text-text-secondary">{row.original.numero}</span>
        ),
      },
      {
        header: "Zona",
        cell: ({ row }) => (
          <span className="text-text-secondary">{row.original.zona ?? "—"}</span>
        ),
      },
      {
        header: "Capacidad",
        cell: ({ row }) => (
          <span className="tabular-nums text-text-secondary">
            {row.original.capacidad ?? "—"}
          </span>
        ),
      },
      {
        header: "Estado",
        cell: ({ row }) =>
          row.original.activa ? (
            <Badge variant="success">Activa</Badge>
          ) : (
            <Badge variant="secondary">Inactiva</Badge>
          ),
      },
      {
        id: "acciones",
        header: () => <span className="sr-only">Acciones</span>,
        cell: ({ row }) => {
          if (!puedeGestionar) return null;
          const m = row.original;
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Acciones">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => abrirEdicion(m)}>
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant={m.activa ? "danger" : "default"}
                    onSelect={() => setPorAlternar(m)}
                  >
                    {m.activa ? "Desactivar" : "Activar"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [puedeGestionar],
  );

  if (mesasQuery.isError) {
    return (
      <>
        <PageHeader title="Mesas" description="Administra las mesas del local." />
        <ErrorState error={mesasQuery.error} onRetry={() => mesasQuery.refetch()} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Mesas"
        description="Administra las mesas del local para asignar órdenes."
        actions={
          <PermissionGate permiso="mesas.gestionar">
            <Button onClick={abrirNuevo}>
              <Plus />
              Nueva mesa
            </Button>
          </PermissionGate>
        }
      />

      <DataTable
        columns={columns}
        data={mesasQuery.data?.data ?? []}
        meta={mesasQuery.data?.meta}
        page={page}
        onPageChange={setPage}
        isLoading={mesasQuery.isLoading}
        emptyState={
          <EmptyState
            title="Aún no hay mesas"
            description="Crea la primera mesa para asignar órdenes en el POS."
            action={
              <PermissionGate permiso="mesas.gestionar">
                <Button onClick={abrirNuevo}>
                  <Plus />
                  Nueva mesa
                </Button>
              </PermissionGate>
            }
          />
        }
      />

      <MesaFormDialog open={formOpen} onOpenChange={setFormOpen} mesa={editando} />

      <ConfirmDialog
        open={Boolean(porAlternar)}
        onOpenChange={(o) => !o && setPorAlternar(undefined)}
        title={porAlternar?.activa ? "Desactivar mesa" : "Activar mesa"}
        description={
          porAlternar?.activa
            ? `${porAlternar?.nombre ?? `Mesa ${porAlternar?.numero}`} dejará de estar disponible para órdenes.`
            : `${porAlternar?.nombre ?? `Mesa ${porAlternar?.numero}`} volverá a estar disponible.`
        }
        confirmLabel={porAlternar?.activa ? "Desactivar" : "Activar"}
        destructive={porAlternar?.activa ?? false}
        loading={activar.isPending}
        onConfirm={confirmarAlternar}
      />
    </>
  );
}
