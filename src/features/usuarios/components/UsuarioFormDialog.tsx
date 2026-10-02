import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCan } from "@/lib/auth";
import type { ApiError } from "@/lib/api/types";
import {
  crearUsuarioSchema,
  editarUsuarioSchema,
  type UsuarioFormInput,
} from "../schemas";
import { esRolAdmin, nombreDeRol } from "@/features/roles/etiquetas";
import type { RolRecurso } from "@/features/roles/types";
import { useGuardarUsuario } from "../api";
import type { UsuarioRecurso } from "../types";

interface UsuarioFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Usuario a editar; si es undefined, es alta. */
  usuario?: UsuarioRecurso;
  /** Catálogo de roles para el selector (nombre = valor enviado). */
  roles: RolRecurso[];
}

/**
 * Formulario de alta/edición de usuario en modal (M04). El password es opcional
 * en edición (vacío = no cambiar). El `rol` se envía por nombre. Los errores de
 * validación del backend se mapean sobre los campos.
 */
export function UsuarioFormDialog({
  open,
  onOpenChange,
  usuario,
  roles,
}: UsuarioFormDialogProps) {
  const esEdicion = Boolean(usuario);
  const guardar = useGuardarUsuario();
  const puedeGestionarAdmins = useCan("usuarios.gestionar_admins");

  // El actor sin `usuarios.gestionar_admins` (p. ej. un gerente) no puede asignar el
  // rol admin: se oculta de la lista (el backend igual lo rechaza — defensa en capas).
  const rolesVisibles = roles.filter(
    (r) => puedeGestionarAdmins || !esRolAdmin(r.name),
  );

  const form = useForm<UsuarioFormInput>({
    resolver: zodResolver(esEdicion ? editarUsuarioSchema : crearUsuarioSchema),
    defaultValues: { nombre: "", email: "", username: "", password: "", rol: "" },
  });

  // Rehidrata el formulario cada vez que se abre o cambia el usuario objetivo.
  useEffect(() => {
    if (!open) return;
    const rolActual = usuario
      ? roles.find((r) => r.id === usuario.id_rol)?.name ?? usuario.roles[0] ?? ""
      : "";
    form.reset({
      nombre: usuario?.nombre ?? "",
      email: usuario?.email ?? "",
      username: usuario?.username ?? "",
      password: "",
      rol: rolActual,
    });
  }, [open, usuario, roles, form]);

  function onSubmit(values: UsuarioFormInput) {
    // Rol previo: el hook solo aplica el cambio de rol si difiere (edición).
    const rolActual = usuario
      ? roles.find((r) => r.id === usuario.id_rol)?.name ?? usuario.roles[0] ?? ""
      : "";
    guardar.mutate(
      { id: usuario?.id, rolActual, ...values },
      {
        onSuccess: () => onOpenChange(false),
        onError: (e: ApiError) => {
          if (e.errors) {
            for (const [campo, msgs] of Object.entries(e.errors)) {
              if (["nombre", "email", "username", "password", "rol"].includes(campo)) {
                form.setError(campo as keyof UsuarioFormInput, { message: msgs[0] });
              }
            }
          }
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{esEdicion ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
          <DialogDescription>
            {esEdicion
              ? "Actualiza los datos del usuario. Deja la contraseña vacía para no cambiarla."
              : "Crea un acceso con un nombre de usuario y una contraseña. El correo es opcional."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input autoFocus placeholder="Nombre completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuario</FormLabel>
                    <FormControl>
                      <Input autoComplete="off" placeholder="nombre.usuario" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="off"
                        placeholder="correo@ejemplo.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <FormControl>
                    <PasswordInput
                      autoComplete="new-password"
                      placeholder="••••••••"
                      {...field}
                    />
                  </FormControl>
                  {esEdicion && (
                    <FormDescription>Déjala vacía para conservar la actual.</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {rolesVisibles.map((rol) => (
                        <SelectItem key={rol.id} value={rol.name}>
                          {nombreDeRol(rol)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={guardar.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={guardar.isPending}>
                {guardar.isPending ? "Guardando…" : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
