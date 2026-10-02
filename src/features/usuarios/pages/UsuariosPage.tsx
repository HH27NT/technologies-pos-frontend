import { useMemo, useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared";
import { useCan } from "@/lib/auth";
import { useRoles } from "@/features/roles/api";
import { esRolAdmin, etiquetaRol } from "@/features/roles/etiquetas";
import type { RolRecurso } from "@/features/roles/types";
import { useModoTerminal } from "@/features/terminal/api";
import { useActivarUsuario, useUsuarios } from "../api";
import { UsuarioFormDialog } from "../components/UsuarioFormDialog";
import { MeseroPinDialog } from "../components/MeseroPinDialog";
import type { UsuarioRecurso } from "../types";

/**
 * Pantalla de Usuarios y roles (M04). Lista paginada con alta/edición en modal,
 * activar/desactivar (con confirmación) y asignación de rol vía el formulario.
 * Todas las acciones se gatean por `usuarios.gestionar` (regla de oro #3).
 */
export function UsuariosPage() {
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<UsuarioRecurso | undefined>();
  const [porAlternar, setPorAlternar] = useState<UsuarioRecurso | undefined>();
  const [porFijarPin, setPorFijarPin] = useState<UsuarioRecurso | undefined>();

  const puedeGestionar = useCan("usuarios.gestionar");
  const puedeGestionarAdmins = useCan("usuarios.gestionar_admins");
  // El PIN de mesero solo existe si el local opera con terminal compartida; en los
  // demás la acción sería un botón que no sirve para nada (criterio del bloque: un
  // tenant sin el modo no ve ni un cambio).
  const modoTerminal = useModoTerminal();
  const pidePin = modoTerminal.data?.terminal_compartida ?? false;
  const usuariosQuery = useUsuarios({ page });
  const rolesQuery = useRoles();
  const activar = useActivarUsuario();

  const roles = useMemo<RolRecurso[]>(() => rolesQuery.data ?? [], [rolesQuery.data]);

  const nombreRol = useMemo(() => {
    const map = new Map(roles.map((r) => [r.id, r.name]));
    // Resuelve por rol real primero (id_rol o nombres spatie); `es_super_admin`
    // queda como último recurso: el backend lo devuelve poco fiable en contexto
    // de super_admin (marca true en todos los registros).
    return (u: UsuarioRecurso) =>
      map.get(u.id_rol ?? -1) ??
      u.roles[0] ??
      (u.es_super_admin ? "super_admin" : "—");
  }, [roles]);

  // Etiqueta a mostrar. Un rol a medida trae la suya del backend; su `name` es un slug
  // (`cajero_nocturno`) que no se debe enseñar.
  const etiquetaDeRol = useMemo(() => {
    const porNombre = new Map(roles.map((r) => [r.name, r]));
    return (u: UsuarioRecurso) => {
      const name = nombreRol(u);
      const rol = porNombre.get(name);
      return rol?.etiqueta ?? etiquetaRol(name);
    };
  }, [roles, nombreRol]);

  function abrirNuevo() {
    setEditando(undefined);
    setFormOpen(true);
  }

  function abrirEdicion(u: UsuarioRecurso) {
    setEditando(u);
    setFormOpen(true);
  }

  function confirmarAlternar() {
    if (!porAlternar) return;
    activar.mutate(porAlternar.id, {
      onSuccess: () => setPorAlternar(undefined),
    });
  }

  const columns = useMemo<ColumnDef<UsuarioRecurso, unknown>[]>(
    () => [
      {
        header: "Nombre",
        accessorKey: "nombre",
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.nombre}</span>
        ),
      },
      {
        header: "Correo / usuario",
        cell: ({ row }) => (
          <span className="text-text-secondary">
            {row.original.email ?? row.original.username ?? "—"}
          </span>
        ),
      },
      {
        header: "Rol",
        cell: ({ row }) => (
          <Badge variant="secondary">{etiquetaDeRol(row.original)}</Badge>
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
          const u = row.original;
          // Salvaguarda anti-escalada: quien no gestiona admins (p. ej. un gerente) no
          // puede editar ni desactivar a un admin. Sin acciones para esas filas.
          if (esRolAdmin(nombreRol(u)) && !puedeGestionarAdmins) return null;
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Acciones">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => abrirEdicion(u)}>
                    Editar
                  </DropdownMenuItem>
                  {pidePin && (
                    <DropdownMenuItem onSelect={() => setPorFijarPin(u)}>
                      PIN de mesero
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    variant={u.activo ? "danger" : "default"}
                    onSelect={() => setPorAlternar(u)}
                  >
                    {u.activo ? "Desactivar" : "Activar"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [nombreRol, etiquetaDeRol, puedeGestionar, puedeGestionarAdmins, pidePin],
  );

  if (usuariosQuery.isError) {
    return (
      <>
        <PageHeader title="Usuarios" description="Gestiona el acceso al sistema." />
        <ErrorState error={usuariosQuery.error} onRetry={() => usuariosQuery.refetch()} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Gestiona el acceso al sistema y los roles del equipo."
        actions={
          <PermissionGate permiso="usuarios.gestionar">
            <Button onClick={abrirNuevo}>
              <Plus />
              Nuevo usuario
            </Button>
          </PermissionGate>
        }
      />

      <DataTable
        columns={columns}
        data={usuariosQuery.data?.data ?? []}
        meta={usuariosQuery.data?.meta}
        page={page}
        onPageChange={setPage}
        isLoading={usuariosQuery.isLoading}
        emptyState={
          <EmptyState
            title="Aún no hay usuarios"
            description="Crea el primer usuario para dar acceso a tu equipo."
            action={
              <PermissionGate permiso="usuarios.gestionar">
                <Button onClick={abrirNuevo}>
                  <Plus />
                  Nuevo usuario
                </Button>
              </PermissionGate>
            }
          />
        }
      />

      <UsuarioFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        usuario={editando}
        roles={roles}
      />

      {/* `key`: remonta el diálogo por persona, así el PIN tecleado nunca sobrevive
          al cierre ni salta de un miembro del personal al siguiente. */}
      <MeseroPinDialog
        key={porFijarPin?.id ?? "sin-usuario"}
        open={Boolean(porFijarPin)}
        onOpenChange={(o) => !o && setPorFijarPin(undefined)}
        usuario={porFijarPin}
      />

      <ConfirmDialog
        open={Boolean(porAlternar)}
        onOpenChange={(o) => !o && setPorAlternar(undefined)}
        title={porAlternar?.activo ? "Desactivar usuario" : "Activar usuario"}
        description={
          porAlternar?.activo
            ? `${porAlternar?.nombre} ya no podrá iniciar sesión.`
            : `${porAlternar?.nombre} podrá iniciar sesión de nuevo.`
        }
        confirmLabel={porAlternar?.activo ? "Desactivar" : "Activar"}
        destructive={porAlternar?.activo}
        loading={activar.isPending}
        onConfirm={confirmarAlternar}
      />
    </>
  );
}
