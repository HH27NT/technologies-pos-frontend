import { useCallback, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, MoreHorizontal, Plus } from "lucide-react";
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
import { useActivarCategoria, useCategorias, useReordenarCategorias } from "../api";
import { CategoriaFormDialog } from "../components/CategoriaFormDialog";
import type { CategoriaRecurso } from "../types";

/**
 * Pantalla de Categorías (M05). Lista paginada con alta/edición en modal,
 * activar/desactivar (con confirmación) y **orden por flechas en la propia tabla**.
 * Todo se gatea por `categorias.gestionar`.
 *
 * El orden se manipula aquí y no en el formulario a propósito: ordenar es comparar,
 * y la comparación necesita ver el menú completo, que es justo lo que un modal tapa.
 */
export function CategoriasPage() {
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<CategoriaRecurso | undefined>();
  const [porAlternar, setPorAlternar] = useState<CategoriaRecurso | undefined>();

  const puedeGestionar = useCan("categorias.gestionar");
  const params = useMemo(() => ({ page }), [page]);
  const categoriasQuery = useCategorias(params);
  const activar = useActivarCategoria();
  const reordenar = useReordenarCategorias(params);

  const meta = categoriasQuery.data?.meta;

  /**
   * Filas en el orden en que se venden: por `orden_display`, y las que aún no
   * tienen posición al final (por nombre) en vez de mezcladas en un lugar
   * arbitrario. No se recalcula nada de negocio aquí, solo se presenta.
   */
  const filas = useMemo(() => {
    const datos = categoriasQuery.data?.data ?? [];
    return [...datos].sort((a, b) => {
      const oa = a.orden_display ?? Number.POSITIVE_INFINITY;
      const ob = b.orden_display ?? Number.POSITIVE_INFINITY;
      return oa === ob ? a.nombre.localeCompare(b.nombre, "es") : oa - ob;
    });
  }, [categoriasQuery.data]);

  /** Posición para la próxima categoría: el final de lo que existe. */
  const ordenSiguiente = useMemo(
    () => filas.reduce((max, c) => Math.max(max, c.orden_display ?? 0), 0) + 1,
    [filas],
  );

  /** Número visible de cada fila, contando las páginas anteriores. */
  const desde = meta ? (meta.current_page - 1) * meta.per_page : 0;

  /** Mueve una fila un lugar y manda la lista completa en su nuevo orden. */
  const mover = useCallback(
    (indice: number, direccion: -1 | 1) => {
      const destino = indice + direccion;
      if (destino < 0 || destino >= filas.length) return;
      const nuevas = [...filas];
      [nuevas[indice], nuevas[destino]] = [nuevas[destino], nuevas[indice]];
      reordenar.mutate(nuevas);
    },
    [filas, reordenar],
  );

  function abrirNuevo() {
    setEditando(undefined);
    setFormOpen(true);
  }

  function abrirEdicion(c: CategoriaRecurso) {
    setEditando(c);
    setFormOpen(true);
  }

  function confirmarAlternar() {
    if (!porAlternar) return;
    activar.mutate(porAlternar.id, {
      onSuccess: () => setPorAlternar(undefined),
    });
  }

  const columns = useMemo<ColumnDef<CategoriaRecurso, unknown>[]>(
    () => [
      {
        header: "Nombre",
        accessorKey: "nombre",
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.nombre}</span>
        ),
      },
      {
        header: "Orden",
        // La posición se muestra también en las inactivas: siguen ocupando su
        // lugar guardado y vuelven a él al reactivarse. Numerar salteado (1, —, 3)
        // confundiría más de lo que aclara; lo que no aplica son las flechas.
        cell: ({ row }) => (
          <span className="tabular-nums text-text-secondary">{desde + row.index + 1}</span>
        ),
      },
      {
        id: "mover",
        header: "Mover",
        cell: ({ row }) => {
          if (!puedeGestionar) return null;
          const c = row.original;
          // El orden solo se aplica en venta, y una categoría inactiva no se
          // muestra ahí: moverla no cambiaría nada. Un control que no puede
          // surtir efecto se apaga, no se deja prometiendo algo que no hará.
          const inactiva = !c.activo;
          const bloqueado = inactiva || reordenar.isPending;
          const motivo = inactiva
            ? "El orden solo aplica a las categorías activas."
            : undefined;

          return (
            <div
              className="inline-flex overflow-hidden rounded-md border border-border"
              title={motivo}
            >
              <Button
                variant="ghost"
                size="icon"
                className="rounded-none text-text-secondary hover:text-brand-accent"
                aria-label={`Subir ${c.nombre}`}
                disabled={bloqueado || row.index === 0}
                onClick={() => mover(row.index, -1)}
              >
                <ChevronUp />
              </Button>
              <span aria-hidden className="w-px self-stretch bg-border" />
              <Button
                variant="ghost"
                size="icon"
                className="rounded-none text-text-secondary hover:text-brand-accent"
                aria-label={`Bajar ${c.nombre}`}
                disabled={bloqueado || row.index === filas.length - 1}
                onClick={() => mover(row.index, 1)}
              >
                <ChevronDown />
              </Button>
            </div>
          );
        },
      },
      {
        header: "Estado",
        cell: ({ row }) =>
          row.original.activo ? (
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
          const c = row.original;
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Acciones">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => abrirEdicion(c)}>
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant={c.activo ? "danger" : "default"}
                    onSelect={() => setPorAlternar(c)}
                  >
                    {c.activo ? "Desactivar" : "Activar"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [puedeGestionar, desde, filas.length, reordenar.isPending, mover],
  );

  if (categoriasQuery.isError) {
    return (
      <>
        <PageHeader title="Categorías" description="Agrupa los productos del menú." />
        <ErrorState error={categoriasQuery.error} onRetry={() => categoriasQuery.refetch()} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Categorías"
        description="Agrupa los productos del menú para venderlos."
        actions={
          <PermissionGate permiso="categorias.gestionar">
            <Button onClick={abrirNuevo}>
              <Plus />
              Nueva categoría
            </Button>
          </PermissionGate>
        }
      />

      <DataTable
        columns={columns}
        data={filas}
        meta={meta}
        page={page}
        onPageChange={setPage}
        isLoading={categoriasQuery.isLoading}
        emptyState={
          <EmptyState
            title="Aún no hay categorías"
            description="Crea la primera categoría para organizar tu menú."
            action={
              <PermissionGate permiso="categorias.gestionar">
                <Button onClick={abrirNuevo}>
                  <Plus />
                  Nueva categoría
                </Button>
              </PermissionGate>
            }
          />
        }
      />

      <CategoriaFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        categoria={editando}
        ordenSiguiente={ordenSiguiente}
      />

      <ConfirmDialog
        open={Boolean(porAlternar)}
        onOpenChange={(o) => !o && setPorAlternar(undefined)}
        title={porAlternar?.activo ? "Desactivar categoría" : "Activar categoría"}
        description={
          porAlternar?.activo
            ? `${porAlternar?.nombre} y sus productos dejarán de mostrarse en venta.`
            : `${porAlternar?.nombre} volverá a mostrarse en venta.`
        }
        confirmLabel={porAlternar?.activo ? "Desactivar" : "Activar"}
        destructive={porAlternar?.activo ?? false}
        loading={activar.isPending}
        onConfirm={confirmarAlternar}
      />
    </>
  );
}
