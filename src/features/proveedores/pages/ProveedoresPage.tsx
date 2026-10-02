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
import { useActivarProveedor, useProveedores } from "../api";
import { ProveedorFormDialog } from "../components/ProveedorFormDialog";
import type { ProveedorRecurso } from "../types";

/**
 * Pantalla de Proveedores (M08). Lista paginada con alta/edición en modal y
 * activar/desactivar (con confirmación). Todo se gatea por `proveedores.gestionar`.
 */
export function ProveedoresPage() {
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<ProveedorRecurso | undefined>();
  const [porAlternar, setPorAlternar] = useState<ProveedorRecurso | undefined>();

  const puedeGestionar = useCan("proveedores.gestionar");
  const proveedoresQuery = useProveedores({ page });
  const activar = useActivarProveedor();

  function abrirNuevo() {
    setEditando(undefined);
    setFormOpen(true);
  }

  function abrirEdicion(p: ProveedorRecurso) {
    setEditando(p);
    setFormOpen(true);
  }

  function confirmarAlternar() {
    if (!porAlternar) return;
    activar.mutate(porAlternar.id, { onSuccess: () => setPorAlternar(undefined) });
  }

  const columns = useMemo<ColumnDef<ProveedorRecurso, unknown>[]>(
    () => [
      {
        header: "Nombre",
        accessorKey: "nombre",
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.nombre}</span>
        ),
      },
      {
        header: "Teléfono",
        cell: ({ row }) => (
          <span className="tabular-nums text-text-secondary">
            {row.original.telefono ?? "—"}
          </span>
        ),
      },
      {
        header: "Correo",
        cell: ({ row }) => (
          <span className="text-text-secondary">{row.original.email ?? "—"}</span>
        ),
      },
      {
        header: "Estado",
        cell: ({ row }) =>
          row.original.activo ? (
            <Badge variant="success">Activo</Badge>
          ) : (
            <Badge variant="secondary">Inactivo</Badge>
          ),
      },
      {
        id: "acciones",
        header: () => <span className="sr-only">Acciones</span>,
        cell: ({ row }) => {
          if (!puedeGestionar) return null;
          const p = row.original;
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Acciones">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => abrirEdicion(p)}>Editar</DropdownMenuItem>
                  <DropdownMenuItem
                    variant={p.activo ? "danger" : "default"}
                    onSelect={() => setPorAlternar(p)}
                  >
                    {p.activo ? "Desactivar" : "Activar"}
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

  if (proveedoresQuery.isError) {
    return (
      <>
        <PageHeader title="Proveedores" description="Administra tus proveedores." />
        <ErrorState error={proveedoresQuery.error} onRetry={() => proveedoresQuery.refetch()} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Proveedores"
        description="Administra los proveedores de tus insumos."
        actions={
          <PermissionGate permiso="proveedores.gestionar">
            <Button onClick={abrirNuevo}>
              <Plus />
              Nuevo proveedor
            </Button>
          </PermissionGate>
        }
      />

      <DataTable
        columns={columns}
        data={proveedoresQuery.data?.data ?? []}
        meta={proveedoresQuery.data?.meta}
        page={page}
        onPageChange={setPage}
        isLoading={proveedoresQuery.isLoading}
        emptyState={
          <EmptyState
            title="Aún no hay proveedores"
            description="Registra tu primer proveedor para asociarlo a los insumos."
            action={
              <PermissionGate permiso="proveedores.gestionar">
                <Button onClick={abrirNuevo}>
                  <Plus />
                  Nuevo proveedor
                </Button>
              </PermissionGate>
            }
          />
        }
      />

      <ProveedorFormDialog open={formOpen} onOpenChange={setFormOpen} proveedor={editando} />

      <ConfirmDialog
        open={Boolean(porAlternar)}
        onOpenChange={(o) => !o && setPorAlternar(undefined)}
        title={porAlternar?.activo ? "Desactivar proveedor" : "Activar proveedor"}
        description={
          porAlternar?.activo
            ? `${porAlternar?.nombre} dejará de estar disponible para nuevos insumos.`
            : `${porAlternar?.nombre} volverá a estar disponible.`
        }
        confirmLabel={porAlternar?.activo ? "Desactivar" : "Activar"}
        destructive={porAlternar?.activo ?? false}
        loading={activar.isPending}
        onConfirm={confirmarAlternar}
      />
    </>
  );
}
