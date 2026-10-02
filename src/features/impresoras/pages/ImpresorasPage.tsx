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
import { useActivarImpresora, useImpresoras } from "../api";
import { tipoImpresoraLabel } from "../constants";
import { ImpresoraFormDialog } from "../components/ImpresoraFormDialog";
import type { ImpresoraRecurso } from "../types";

/**
 * Pantalla de Impresoras (M13). Lista paginada con alta/edición en modal y
 * activar/desactivar (con confirmación). Todo se gatea por `impresoras.gestionar`.
 */
export function ImpresorasPage() {
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<ImpresoraRecurso | undefined>();
  const [porAlternar, setPorAlternar] = useState<ImpresoraRecurso | undefined>();

  const puedeGestionar = useCan("impresoras.gestionar");
  const impresorasQuery = useImpresoras({ page });
  const activar = useActivarImpresora();

  function abrirNuevo() {
    setEditando(undefined);
    setFormOpen(true);
  }

  function abrirEdicion(i: ImpresoraRecurso) {
    setEditando(i);
    setFormOpen(true);
  }

  function confirmarAlternar() {
    if (!porAlternar) return;
    activar.mutate(porAlternar.id, {
      onSuccess: () => setPorAlternar(undefined),
    });
  }

  const columns = useMemo<ColumnDef<ImpresoraRecurso, unknown>[]>(
    () => [
      {
        header: "Impresora",
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.nombre}</span>
        ),
      },
      {
        header: "Tipo",
        cell: ({ row }) => (
          <span className="text-text-secondary">{tipoImpresoraLabel(row.original.tipo)}</span>
        ),
      },
      {
        header: "Conexión",
        cell: ({ row }) => (
          <span className="text-text-secondary">{row.original.conexion ?? "—"}</span>
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
          const i = row.original;
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Acciones">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => abrirEdicion(i)}>Editar</DropdownMenuItem>
                  <DropdownMenuItem
                    variant={i.activa ? "danger" : "default"}
                    onSelect={() => setPorAlternar(i)}
                  >
                    {i.activa ? "Desactivar" : "Activar"}
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

  if (impresorasQuery.isError) {
    return (
      <>
        <PageHeader title="Impresoras" description="Administra las impresoras del local." />
        <ErrorState error={impresorasQuery.error} onRetry={() => impresorasQuery.refetch()} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Impresoras"
        description="Administra las impresoras de comandas (barra/cocina) y de tickets."
        actions={
          <PermissionGate permiso="impresoras.gestionar">
            <Button onClick={abrirNuevo}>
              <Plus />
              Nueva impresora
            </Button>
          </PermissionGate>
        }
      />

      <DataTable
        columns={columns}
        data={impresorasQuery.data?.data ?? []}
        meta={impresorasQuery.data?.meta}
        page={page}
        onPageChange={setPage}
        isLoading={impresorasQuery.isLoading}
        emptyState={
          <EmptyState
            title="Aún no hay impresoras"
            description="Registra la primera impresora para comandas o tickets."
            action={
              <PermissionGate permiso="impresoras.gestionar">
                <Button onClick={abrirNuevo}>
                  <Plus />
                  Nueva impresora
                </Button>
              </PermissionGate>
            }
          />
        }
      />

      <ImpresoraFormDialog open={formOpen} onOpenChange={setFormOpen} impresora={editando} />

      <ConfirmDialog
        open={Boolean(porAlternar)}
        onOpenChange={(o) => !o && setPorAlternar(undefined)}
        title={porAlternar?.activa ? "Desactivar impresora" : "Activar impresora"}
        description={
          porAlternar?.activa
            ? `${porAlternar?.nombre} dejará de recibir impresiones.`
            : `${porAlternar?.nombre} volverá a estar disponible.`
        }
        confirmLabel={porAlternar?.activa ? "Desactivar" : "Activar"}
        destructive={porAlternar?.activa ?? false}
        loading={activar.isPending}
        onConfirm={confirmarAlternar}
      />
    </>
  );
}
