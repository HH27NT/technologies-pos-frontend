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
import { useEliminarUnidad, useUnidades } from "../api";
import { UnidadFormDialog } from "../components/UnidadFormDialog";
import type { UnidadRecurso } from "../types";

/**
 * Pantalla de Unidades de medida (M08). Lista paginada con alta/edición en modal
 * y borrado (DELETE). Las unidades globales son de solo lectura (sin acciones).
 * Todo se gatea por `unidades.gestionar`.
 */
export function UnidadesPage() {
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<UnidadRecurso | undefined>();
  const [porBorrar, setPorBorrar] = useState<UnidadRecurso | undefined>();

  const puedeGestionar = useCan("unidades.gestionar");
  const unidadesQuery = useUnidades({ page });
  const eliminar = useEliminarUnidad();

  function abrirNuevo() {
    setEditando(undefined);
    setFormOpen(true);
  }

  function abrirEdicion(u: UnidadRecurso) {
    setEditando(u);
    setFormOpen(true);
  }

  function confirmarBorrar() {
    if (!porBorrar) return;
    eliminar.mutate(porBorrar.id, { onSuccess: () => setPorBorrar(undefined) });
  }

  const columns = useMemo<ColumnDef<UnidadRecurso, unknown>[]>(
    () => [
      {
        header: "Nombre",
        accessorKey: "nombre",
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.nombre}</span>
        ),
      },
      {
        header: "Abreviación",
        cell: ({ row }) => (
          <span className="text-text-secondary">{row.original.abreviacion ?? "—"}</span>
        ),
      },
      {
        header: "Tipo",
        cell: ({ row }) =>
          row.original.es_global ? (
            <Badge variant="secondary">Global</Badge>
          ) : (
            <Badge variant="info">Propia</Badge>
          ),
      },
      {
        id: "acciones",
        header: () => <span className="sr-only">Acciones</span>,
        cell: ({ row }) => {
          const u = row.original;
          // Las globales son de solo lectura: no se editan ni se borran.
          if (!puedeGestionar || u.es_global) return null;
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Acciones">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => abrirEdicion(u)}>Editar</DropdownMenuItem>
                  <DropdownMenuItem variant="danger" onSelect={() => setPorBorrar(u)}>
                    Eliminar
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

  if (unidadesQuery.isError) {
    return (
      <>
        <PageHeader title="Unidades de medida" description="Unidades para tus insumos." />
        <ErrorState error={unidadesQuery.error} onRetry={() => unidadesQuery.refetch()} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Unidades de medida"
        description="Unidades con las que mides y compras tus insumos."
        actions={
          <PermissionGate permiso="unidades.gestionar">
            <Button onClick={abrirNuevo}>
              <Plus />
              Nueva unidad
            </Button>
          </PermissionGate>
        }
      />

      <DataTable
        columns={columns}
        data={unidadesQuery.data?.data ?? []}
        meta={unidadesQuery.data?.meta}
        page={page}
        onPageChange={setPage}
        isLoading={unidadesQuery.isLoading}
        emptyState={
          <EmptyState
            title="Aún no hay unidades propias"
            description="Crea una unidad de medida a la medida de tu operación."
            action={
              <PermissionGate permiso="unidades.gestionar">
                <Button onClick={abrirNuevo}>
                  <Plus />
                  Nueva unidad
                </Button>
              </PermissionGate>
            }
          />
        }
      />

      <UnidadFormDialog open={formOpen} onOpenChange={setFormOpen} unidad={editando} />

      <ConfirmDialog
        open={Boolean(porBorrar)}
        onOpenChange={(o) => !o && setPorBorrar(undefined)}
        title="Eliminar unidad"
        description={`Se eliminará "${porBorrar?.nombre}". Los insumos que la usen podrían verse afectados.`}
        confirmLabel="Eliminar"
        destructive
        loading={eliminar.isPending}
        onConfirm={confirmarBorrar}
      />
    </>
  );
}
