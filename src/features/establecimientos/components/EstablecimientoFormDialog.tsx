import { useEffect } from "react";
import { useFieldArray, useForm, type FieldPath, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
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
import type { ApiError } from "@/lib/api/types";
import {
  crearEstablecimientoSchema,
  editarEstablecimientoSchema,
  ROLES_PERSONAL,
  type CrearEstablecimientoInput,
  type RolPersonal,
} from "../schemas";
import { useGuardarEstablecimiento } from "../api";
import type { EstablecimientoRecurso } from "../types";

const ETIQUETA_ROL_PERSONAL: Record<RolPersonal, string> = {
  gerente: "Gerente",
  operador: "Operador",
  mesero: "Mesero",
};

const PERSONA_VACIA = {
  rol: "operador" as RolPersonal,
  nombre: "",
  username: "",
  email: "",
  password: "",
  password_confirmation: "",
};

interface EstablecimientoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Establecimiento a editar; si es undefined, es alta (con admin inicial). */
  establecimiento?: EstablecimientoRecurso;
}

/** El form maneja el superconjunto de campos; en edición no se envía `admin`. */
type FormValues = CrearEstablecimientoInput;

const VALORES_VACIOS: FormValues = {
  nombre: "",
  razon_social: "",
  rfc: "",
  direccion: "",
  telefono: "",
  email: "",
  zona_horaria: "America/Mexico_City",
  moneda: "MXN",
  admin: { nombre: "", email: "", username: "", password: "" },
  admin_password_confirmation: "",
  personal: [],
};

/** Rutas de error válidas para mapear los `errors` del backend (incluye anidados). */
const CAMPOS_ERROR = [
  "nombre",
  "razon_social",
  "rfc",
  "direccion",
  "telefono",
  "email",
  "zona_horaria",
  "moneda",
  "admin.nombre",
  "admin.email",
  "admin.username",
  "admin.password",
] as const;

/**
 * Alta/edición de un establecimiento (M02, super_admin). Al crear, recoge también
 * los datos del administrador inicial (el backend crea ambos en un paso). Al editar,
 * solo los datos del establecimiento. Los errores del backend (incluidos los
 * anidados `admin.*`) se mapean sobre los campos.
 */
export function EstablecimientoFormDialog({
  open,
  onOpenChange,
  establecimiento,
}: EstablecimientoFormDialogProps) {
  const esEdicion = Boolean(establecimiento);
  const guardar = useGuardarEstablecimiento();

  const form = useForm<FormValues>({
    resolver: zodResolver(
      esEdicion ? editarEstablecimientoSchema : crearEstablecimientoSchema,
    ) as unknown as Resolver<FormValues>,
    defaultValues: VALORES_VACIOS,
  });

  const personal = useFieldArray({ control: form.control, name: "personal" });

  useEffect(() => {
    if (!open) return;
    form.reset(
      establecimiento
        ? {
            nombre: establecimiento.nombre,
            razon_social: establecimiento.razon_social ?? "",
            rfc: establecimiento.rfc ?? "",
            direccion: establecimiento.direccion ?? "",
            telefono: establecimiento.telefono ?? "",
            email: establecimiento.email ?? "",
            zona_horaria: establecimiento.zona_horaria,
            moneda: establecimiento.moneda,
            admin: { nombre: "", email: "", username: "", password: "" },
            admin_password_confirmation: "",
            personal: [],
          }
        : VALORES_VACIOS,
    );
  }, [open, establecimiento, form]);

  function onSubmit(values: FormValues) {
    guardar.mutate(
      {
        id: establecimiento?.id,
        nombre: values.nombre,
        razon_social: vacioANull(values.razon_social),
        rfc: vacioANull(values.rfc),
        direccion: vacioANull(values.direccion),
        telefono: vacioANull(values.telefono),
        email: vacioANull(values.email),
        zona_horaria: values.zona_horaria,
        moneda: values.moneda,
        // El admin y el personal solo viajan al crear; en edición se ignoran.
        admin: esEdicion ? undefined : values.admin,
        personal: esEdicion ? undefined : values.personal,
      },
      {
        onSuccess: () => onOpenChange(false),
        onError: (e: ApiError) => {
          if (e.errors) {
            for (const [campo, msgs] of Object.entries(e.errors)) {
              if (
                (CAMPOS_ERROR as readonly string[]).includes(campo) ||
                /^personal\.\d+\.(rol|nombre|username|email|password)$/.test(campo)
              ) {
                form.setError(campo as FieldPath<FormValues>, { message: msgs[0] });
              }
            }
          }
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {esEdicion ? "Editar establecimiento" : "Nuevo establecimiento"}
          </DialogTitle>
          <DialogDescription>
            {esEdicion
              ? "Actualiza los datos del establecimiento."
              : "Registra el establecimiento y su administrador inicial."}
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
                    <Input autoFocus placeholder="Ej. Bar Demo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="razon_social"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Razón social</FormLabel>
                    <FormControl>
                      <Input placeholder="Opcional" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rfc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RFC</FormLabel>
                    <FormControl>
                      <Input placeholder="Opcional" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="direccion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input placeholder="Opcional" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="telefono"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input placeholder="Opcional" {...field} value={field.value ?? ""} />
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
                    <FormLabel>Correo</FormLabel>
                    <FormControl>
                      <Input placeholder="Opcional" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="zona_horaria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zona horaria</FormLabel>
                    <FormControl>
                      <Input placeholder="America/Mexico_City" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="moneda"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Moneda</FormLabel>
                    <FormControl>
                      <Input placeholder="MXN" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {!esEdicion && (
              <div className="space-y-4 rounded-lg border border-border p-4">
                <div>
                  <h3 className="font-display text-sm font-semibold text-foreground">
                    Administrador inicial
                  </h3>
                  <FormDescription>
                    Se crea junto al establecimiento y podrá gestionarlo.
                  </FormDescription>
                </div>

                <FormField
                  control={form.control}
                  name="admin.nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del administrador</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. Ana López" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="admin.username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Usuario</FormLabel>
                        <FormControl>
                          <Input autoComplete="off" placeholder="admin.bar" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="admin.email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Correo (opcional)</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            autoComplete="off"
                            placeholder="admin@bar.com"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="admin.password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                        <PasswordInput autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="admin_password_confirmation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar contraseña</FormLabel>
                      <FormControl>
                        <PasswordInput autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {!esEdicion && (
              <div className="space-y-4 rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display text-sm font-semibold text-foreground">
                      Personal adicional
                    </h3>
                    <FormDescription>
                      Opcional. Da de alta al resto del equipo de una vez; también se
                      puede hacer después desde Usuarios.
                    </FormDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => personal.append({ ...PERSONA_VACIA })}
                  >
                    <Plus className="size-4" />
                    Agregar
                  </Button>
                </div>

                {personal.fields.map((campo, indice) => (
                  <div
                    key={campo.id}
                    className="space-y-3 rounded-md border border-border bg-surface-2 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <FormField
                        control={form.control}
                        name={`personal.${indice}.rol`}
                        render={({ field }) => (
                          <FormItem className="w-40">
                            <FormLabel>Rol</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {ROLES_PERSONAL.map((r) => (
                                  <SelectItem key={r} value={r}>
                                    {ETIQUETA_ROL_PERSONAL[r]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mt-6 text-danger hover:text-danger"
                        onClick={() => personal.remove(indice)}
                        aria-label="Quitar"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    <FormField
                      control={form.control}
                      name={`personal.${indice}.nombre`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej. Luis Pérez" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name={`personal.${indice}.username`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Usuario</FormLabel>
                            <FormControl>
                              <Input autoComplete="off" placeholder="luis.bar" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`personal.${indice}.email`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Correo (opcional)</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                autoComplete="off"
                                placeholder="luis@bar.com"
                                {...field}
                                value={field.value ?? ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name={`personal.${indice}.password`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contraseña</FormLabel>
                            <FormControl>
                              <PasswordInput autoComplete="new-password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`personal.${indice}.password_confirmation`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirmar</FormLabel>
                            <FormControl>
                              <PasswordInput autoComplete="new-password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

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

/** Convierte cadena vacía a null (el backend distingue "sin valor" de ""). */
function vacioANull(v: string): string | null {
  const t = v.trim();
  return t === "" ? null : t;
}
