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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCan, useCanAny } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { useUnidades } from "@/features/unidades";
import type { UnidadRecurso } from "@/features/unidades";
import { useProveedores } from "@/features/proveedores";
import type { ProveedorRecurso } from "@/features/proveedores";
import { useActivarInsumo, useInsumos } from "../api";
import { InsumoFormDialog } from "../components/InsumoFormDialog";
import { MovimientoDialog } from "../components/MovimientoDialog";
import { KardexDialog } from "../components/KardexDialog";
import type { InsumoRecurso } from "../types";

/**
 * Pantalla de Insumos (M08). Lista paginada con alta/edición, activar/desactivar,
 * registrar movimiento (entrada/ajuste/merma) y ver kardex. Muestra la existencia
 * (read-only) y marca los insumos con stock bajo. Se gatea por `insumos.gestionar`.
 */
export function InsumosPage() {
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [movOpen, setMovOpen] = useState(false);
  const [kardexOpen, setKardexOpen] = useState(false);
  const [editando, setEditando] = useState<InsumoRecurso | undefined>();
  const [enfocado, setEnfocado] = useState<InsumoRecurso | undefined>();
  const [porAlternar, setPorAlternar] = useState<InsumoRecurso | undefined>();

  const puedeGestionar = useCan("insumos.gestionar");
  const puedeMover = useCanAny("inventario.entrada", "inventario.ajustar", "inventario.merma");

  const insumosQuery = useInsumos({ page });
  const unidadesQuery = useUnidades({ per_page: 100 });
  const proveedoresQuery = useProveedores({ per_page: 100 });
  const activar = useActivarInsumo();

  const unidades = useMemo<UnidadRecurso[]>(
    () => unidadesQuery.data?.data ?? [],
    [unidadesQuery.data],
  );
  const proveedores = useMemo<ProveedorRecurso[]>(
    () => proveedoresQuery.data?.data ?? [],
    [proveedoresQuery.data],
  );

  function abrirNuevo() {
    setEditando(undefined);
    setFormOpen(true);
  }

  function abrirEdicion(i: InsumoRecurso) {
    setEditando(i);
    setFormOpen(true);
  }

  function abrirMovimiento(i: InsumoRecurso) {
    setEnfocado(i);
    setMovOpen(true);
  }

  function abrirKardex(i: InsumoRecurso) {
    setEnfocado(i);
    setKardexOpen(true);
  }

  function confirmarAlternar() {
    if (!porAlternar) return;
    activar.mutate(porAlternar.id, { onSuccess: () => setPorAlternar(undefined) });
  }

  const columns = useMemo<ColumnDef<InsumoRecurso, unknown>[]>(
    () => [
      {
        header: "Nombre",
        accessorKey: "nombre",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{row.original.nombre}</span>
              {/* Solo se rotula la excepción: casi todos los insumos son controlados,
                  y una etiqueta en cada renglón dejaría de significar nada. */}
              {row.original.tipo === "consumo" && (
                <Badge
                  variant="secondary"
                  title="No se descuenta al vender: su existencia se corrige contando."
                >
                  De consumo
                </Badge>
              )}
            </div>
            {row.original.proveedor && (
              <span className="text-xs text-text-secondary">{row.original.proveedor.nombre}</span>
            )}
          </div>
        ),
      },
      {
        header: () => <span className="block text-right">Existencia</span>,
        id: "stock_actual",
        cell: ({ row }) => {
          const i = row.original;
          const uni = i.unidad_medida?.abreviacion ?? "";
          return (
            <div className="flex items-center justify-end gap-2">
              {i.stock_bajo && <Badge variant="warning">Bajo</Badge>}
              <span className="tabular-nums text-foreground">
                {i.stock_actual} {uni}
              </span>
            </div>
          );
        },
      },
      {
        header: () => <span className="block text-right">Mínimo</span>,
        id: "stock_minimo",
        cell: ({ row }) => (
          <span className="block text-right tabular-nums text-text-secondary">
            {row.original.stock_minimo}
          </span>
        ),
      },
      {
        header: () => <span className="block text-right">Costo</span>,
        id: "costo_unitario",
        cell: ({ row }) => (
          <span className="block text-right tabular-nums text-text-secondary">
            {row.original.costo_unitario != null ? formatMoney(row.original.costo_unitario) : "—"}
          </span>
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
          const i = row.original;
          if (!puedeGestionar && !puedeMover) return null;
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Acciones">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {puedeMover && (
                    <DropdownMenuItem onSelect={() => abrirMovimiento(i)}>
                      Registrar movimiento
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={() => abrirKardex(i)}>Ver kardex</DropdownMenuItem>
                  {puedeGestionar && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => abrirEdicion(i)}>Editar</DropdownMenuItem>
                      <DropdownMenuItem
                        variant={i.activo ? "danger" : "default"}
                        onSelect={() => setPorAlternar(i)}
                      >
                        {i.activo ? "Desactivar" : "Activar"}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [puedeGestionar, puedeMover],
  );

  if (insumosQuery.isError) {
    return (
      <>
        <PageHeader title="Insumos" description="Administra tus insumos y existencias." />
        <ErrorState error={insumosQuery.error} onRetry={() => insumosQuery.refetch()} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Insumos"
        description="Administra tus insumos, su existencia y sus movimientos."
        actions={
          <PermissionGate permiso="insumos.gestionar">
            <Button onClick={abrirNuevo}>
              <Plus />
              Nuevo insumo
            </Button>
          </PermissionGate>
        }
      />

      <DataTable
        columns={columns}
        data={insumosQuery.data?.data ?? []}
        meta={insumosQuery.data?.meta}
        page={page}
        onPageChange={setPage}
        isLoading={insumosQuery.isLoading}
        emptyState={
          <EmptyState
            title="Aún no hay insumos"
            description="Crea tu primer insumo para llevar el control de existencias."
            action={
              <PermissionGate permiso="insumos.gestionar">
                <Button onClick={abrirNuevo}>
                  <Plus />
                  Nuevo insumo
                </Button>
              </PermissionGate>
            }
          />
        }
      />

      <InsumoFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        insumo={editando}
        unidades={unidades}
        proveedores={proveedores}
      />

      <MovimientoDialog open={movOpen} onOpenChange={setMovOpen} insumo={enfocado} />

      <KardexDialog open={kardexOpen} onOpenChange={setKardexOpen} insumo={enfocado} />

      <ConfirmDialog
        open={Boolean(porAlternar)}
        onOpenChange={(o) => !o && setPorAlternar(undefined)}
        title={porAlternar?.activo ? "Desactivar insumo" : "Activar insumo"}
        description={
          porAlternar?.activo
            ? `${porAlternar?.nombre} dejará de estar disponible.`
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
