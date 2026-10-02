import { useMemo, useState } from "react";
import { Copy, MoreHorizontal, Plus, ShieldCheck } from "lucide-react";
import {
  PageHeader,
  EmptyState,
  ErrorState,
  PermissionGate,
  ConfirmDialog,
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
import { useEliminarRol, useRoles } from "../api";
import { nombreDeRol } from "../etiquetas";
import { RolFormDialog, type ModoRol } from "../components/RolFormDialog";
import type { RolRecurso } from "../types";

/**
 * Pantalla de Roles (M04 · editor a medida). Separa los roles del SISTEMA —presets
 * de solo lectura que solo se clonan— de los PROPIOS del establecimiento.
 *
 * La separación no es decorativa: los presets se resincronizan contra el catálogo en
 * cada arranque del backend, así que editarlos se perdería en el siguiente despliegue.
 * Ofrecer "Clonar" en vez de "Editar" es lo que hace que esa regla se entienda sin
 * leer documentación.
 */
export function RolesPage() {
  const [modo, setModo] = useState<ModoRol>({ tipo: "crear" });
  const [formOpen, setFormOpen] = useState(false);
  const [porEliminar, setPorEliminar] = useState<RolRecurso | undefined>();

  const puedeGestionar = useCan("roles.gestionar");
  const rolesQuery = useRoles();
  const eliminar = useEliminarRol();

  const { delSistema, propios } = useMemo(() => {
    const roles = rolesQuery.data ?? [];
    return {
      delSistema: roles.filter((r) => r.es_sistema),
      propios: roles.filter((r) => !r.es_sistema),
    };
  }, [rolesQuery.data]);

  function abrir(nuevoModo: ModoRol) {
    setModo(nuevoModo);
    setFormOpen(true);
  }

  function confirmarEliminar() {
    if (!porEliminar) return;
    eliminar.mutate(porEliminar.id, { onSuccess: () => setPorEliminar(undefined) });
  }

  if (rolesQuery.isError) {
    return (
      <>
        <PageHeader title="Roles" description="Define qué puede hacer cada persona." />
        <ErrorState error={rolesQuery.error} onRetry={() => rolesQuery.refetch()} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Roles"
        description="Define qué puede hacer cada persona de tu equipo."
        actions={
          <PermissionGate permiso="roles.gestionar">
            <Button onClick={() => abrir({ tipo: "crear" })}>
              <Plus />
              Crear rol
            </Button>
          </PermissionGate>
        }
      />

      {rolesQuery.isLoading ? (
        <p className="py-10 text-center text-sm text-text-muted">Cargando roles…</p>
      ) : (
        <div className="space-y-8">
          <section className="space-y-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">
                Roles del sistema
              </h2>
              <p className="text-sm text-text-secondary">
                Vienen con el sistema y se mantienen al día solos. Para adaptarlos, clónalos.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {delSistema.map((rol) => (
                <TarjetaRol
                  key={rol.id}
                  rol={rol}
                  acciones={
                    puedeGestionar ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => abrir({ tipo: "clonar", origen: rol })}
                      >
                        <Copy />
                        Clonar
                      </Button>
                    ) : null
                  }
                />
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">
                Roles propios
              </h2>
              <p className="text-sm text-text-secondary">
                Los que creaste para tu negocio. Puedes editarlos cuando quieras.
              </p>
            </div>

            {propios.length === 0 ? (
              <EmptyState
                title="Aún no tienes roles propios"
                description="Clona uno del sistema y ajústalo, o crea uno desde cero."
                action={
                  <PermissionGate permiso="roles.gestionar">
                    <Button onClick={() => abrir({ tipo: "crear" })}>
                      <Plus />
                      Crear rol
                    </Button>
                  </PermissionGate>
                }
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {propios.map((rol) => (
                  <TarjetaRol
                    key={rol.id}
                    rol={rol}
                    acciones={
                      puedeGestionar ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Acciones">
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={() => abrir({ tipo: "editar", rol })}
                            >
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => abrir({ tipo: "clonar", origen: rol })}
                            >
                              Clonar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="danger"
                              onSelect={() => setPorEliminar(rol)}
                            >
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null
                    }
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      <RolFormDialog open={formOpen} onOpenChange={setFormOpen} modo={modo} />

      <ConfirmDialog
        open={Boolean(porEliminar)}
        onOpenChange={(o) => !o && setPorEliminar(undefined)}
        title="Eliminar rol"
        description={
          porEliminar
            ? `Se eliminará "${nombreDeRol(porEliminar)}". Si tiene usuarios asignados, primero deberás moverlos a otro rol.`
            : ""
        }
        confirmLabel="Eliminar"
        destructive
        loading={eliminar.isPending}
        onConfirm={confirmarEliminar}
      />
    </>
  );
}

/** Tarjeta de un rol: nombre, para qué sirve, y su peso real (usuarios y permisos). */
function TarjetaRol({
  rol,
  acciones,
}: {
  rol: RolRecurso;
  acciones: React.ReactNode;
}) {
  const usuarios = rol.usuarios_count ?? 0;
  const permisos = rol.permisos.length;

  return (
    <article className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="font-display font-semibold text-foreground">
            {nombreDeRol(rol)}
          </h3>
          {rol.es_sistema && (
            <Badge variant="secondary" className="gap-1">
              <ShieldCheck className="size-3" />
              Sistema
            </Badge>
          )}
        </div>

        {rol.descripcion && (
          <p className="text-sm text-text-secondary">{rol.descripcion}</p>
        )}

        <p className="text-xs text-text-muted tabular-nums">
          {permisos === 1 ? "1 permiso" : `${permisos} permisos`} ·{" "}
          {usuarios === 1 ? "1 usuario" : `${usuarios} usuarios`}
        </p>
      </div>

      {acciones && <div className="shrink-0">{acciones}</div>}
    </article>
  );
}
