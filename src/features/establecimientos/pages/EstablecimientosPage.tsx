import { useMemo, useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import {
  PageHeader,
  DataTable,
  EmptyState,
  ErrorState,
  ConfirmDialog,
  PermissionGate,
  EstadoPill,
  type ColumnDef,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCan } from "@/lib/auth";
import { useActivarEstablecimiento, useEstablecimientos } from "../api";
import { EstablecimientoFormDialog } from "../components/EstablecimientoFormDialog";
import { RestablecerAccesoDialog } from "../components/RestablecerAccesoDialog";
import type { EstablecimientoRecurso } from "../types";

/**
 * Pantalla de Plataforma / Establecimientos (M02). Solo super_admin. Lista
 * paginada con alta (establecimiento + admin inicial), edición y
 * activar/desactivar. Cada acción se gatea por su permiso. Promover a un usuario
 * a admin es una acción del tenant y vive en el módulo Usuarios, no aquí.
 */
export function EstablecimientosPage() {
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<EstablecimientoRecurso | undefined>();
  const [porAlternar, setPorAlternar] = useState<EstablecimientoRecurso | undefined>();
  const [porRestablecer, setPorRestablecer] = useState<EstablecimientoRecurso | undefined>();

  const puedeGestionar = useCan("establecimientos.gestionar");
  const puedeActivar = useCan("establecimientos.activar");
  const puedeRestablecer = useCan("establecimientos.restablecer_acceso");
  const puedeAlgunaAccion = puedeGestionar || puedeActivar || puedeRestablecer;

  const establecimientosQuery = useEstablecimientos({ page });
  const activar = useActivarEstablecimiento();

  function abrirNuevo() {
    setEditando(undefined);
    setFormOpen(true);
  }

  function abrirEdicion(e: EstablecimientoRecurso) {
    setEditando(e);
    setFormOpen(true);
  }

  function confirmarAlternar() {
    if (!porAlternar) return;
    activar.mutate(porAlternar.id, {
      onSuccess: () => setPorAlternar(undefined),
    });
  }

  const columns = useMemo<ColumnDef<EstablecimientoRecurso, unknown>[]>(
    () => [
      {
        header: "Establecimiento",
        cell: ({ row }) => (
          <div>
            <span className="font-medium text-foreground">{row.original.nombre}</span>
            {row.original.rfc && (
              <span className="block text-xs text-text-secondary">{row.original.rfc}</span>
            )}
          </div>
        ),
      },
      {
        header: "Moneda",
        cell: ({ row }) => (
          <span className="text-text-secondary tabular-nums">{row.original.moneda}</span>
        ),
      },
      {
        header: "Zona horaria",
        cell: ({ row }) => (
          <span className="text-text-secondary">{row.original.zona_horaria}</span>
        ),
      },
      {
        header: "Estado",
        cell: ({ row }) =>
          row.original.activo ? (
            <EstadoPill tono="activo">Activo</EstadoPill>
          ) : (
            <EstadoPill tono="inactivo">Inactivo</EstadoPill>
          ),
      },
      {
        id: "acciones",
        header: () => <span className="sr-only">Acciones</span>,
        cell: ({ row }) => {
          if (!puedeAlgunaAccion) return null;
          const e = row.original;
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Acciones">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {puedeGestionar && (
                    <DropdownMenuItem onSelect={() => abrirEdicion(e)}>Editar</DropdownMenuItem>
                  )}
                  {puedeRestablecer && (
                    <DropdownMenuItem onSelect={() => setPorRestablecer(e)}>
                      Restablecer acceso del admin
                    </DropdownMenuItem>
                  )}
                  {puedeActivar && (
                    <DropdownMenuItem
                      variant={e.activo ? "danger" : "default"}
                      onSelect={() => setPorAlternar(e)}
                    >
                      {e.activo ? "Desactivar" : "Activar"}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [puedeAlgunaAccion, puedeGestionar, puedeActivar, puedeRestablecer],
  );

  if (establecimientosQuery.isError) {
    return (
      <>
        <PageHeader title="Establecimientos" description="Gestión de la plataforma." />
        <ErrorState
          error={establecimientosQuery.error}
          onRetry={() => establecimientosQuery.refetch()}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Establecimientos"
        description="Alta y administración de los negocios de la plataforma (cruza tenants)."
        actions={
          <PermissionGate permiso="establecimientos.gestionar">
            <Button onClick={abrirNuevo}>
              <Plus />
              Nuevo establecimiento
            </Button>
          </PermissionGate>
        }
      />

      <DataTable
        columns={columns}
        data={establecimientosQuery.data?.data ?? []}
        meta={establecimientosQuery.data?.meta}
        page={page}
        onPageChange={setPage}
        isLoading={establecimientosQuery.isLoading}
        emptyState={
          <EmptyState
            title="Aún no hay establecimientos"
            description="Crea el primer establecimiento y su administrador."
            action={
              <PermissionGate permiso="establecimientos.gestionar">
                <Button onClick={abrirNuevo}>
                  <Plus />
                  Nuevo establecimiento
                </Button>
              </PermissionGate>
            }
          />
        }
      />

      <EstablecimientoFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        establecimiento={editando}
      />

      <RestablecerAccesoDialog
        key={porRestablecer?.id ?? "cerrado"}
        establecimiento={porRestablecer}
        onOpenChange={(o) => !o && setPorRestablecer(undefined)}
      />

      <ConfirmDialog
        open={Boolean(porAlternar)}
        onOpenChange={(o) => !o && setPorAlternar(undefined)}
        title={porAlternar?.activo ? "Desactivar establecimiento" : "Activar establecimiento"}
        description={
          porAlternar?.activo
            ? `${porAlternar?.nombre} dejará de operar.`
            : `${porAlternar?.nombre} volverá a operar.`
        }
        confirmLabel={porAlternar?.activo ? "Desactivar" : "Activar"}
        destructive={porAlternar?.activo ?? false}
        loading={activar.isPending}
        onConfirm={confirmarAlternar}
      />
    </>
  );
}
