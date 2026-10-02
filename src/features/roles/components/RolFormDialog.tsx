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
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared";
import type { ApiError } from "@/lib/api/types";
import { rolSchema, type RolFormInput } from "../schemas";
import { useGuardarRol, usePermisosCatalogo } from "../api";
import { nombreDeRol } from "../etiquetas";
import { SelectorPermisos } from "./SelectorPermisos";
import type { RolRecurso } from "../types";

/** Qué está haciendo el diálogo. Determina el título, el origen y el payload. */
export type ModoRol =
  | { tipo: "crear" }
  | { tipo: "editar"; rol: RolRecurso }
  | { tipo: "clonar"; origen: RolRecurso };

interface RolFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modo: ModoRol;
}

/**
 * Alta, clonación y edición de un rol a medida (M04).
 *
 * Clonar es un modo del mismo formulario y no una pantalla aparte: el resultado es
 * idéntico (un rol propio nuevo), solo cambia de dónde salen los permisos iniciales.
 * Es la vía de personalización, porque los presets del sistema son de solo lectura —
 * se resincronizan en cada arranque y cualquier edición se perdería.
 */
export function RolFormDialog({ open, onOpenChange, modo }: RolFormDialogProps) {
  const guardar = useGuardarRol();
  // Solo se pide el catálogo cuando el diálogo está abierto: son 35 permisos con texto
  // que no hacen falta mientras se mira la lista.
  const catalogo = usePermisosCatalogo(open);

  const esEdicion = modo.tipo === "editar";

  const form = useForm<RolFormInput>({
    resolver: zodResolver(rolSchema),
    defaultValues: { etiqueta: "", descripcion: "", permisos: [] },
  });

  // Rehidrata al abrir: en clonación hereda los permisos del origen y propone un
  // nombre editable; en edición carga el rol tal cual.
  useEffect(() => {
    if (!open) return;
    if (modo.tipo === "editar") {
      form.reset({
        etiqueta: modo.rol.etiqueta ?? "",
        descripcion: modo.rol.descripcion ?? "",
        permisos: modo.rol.permisos,
      });
    } else if (modo.tipo === "clonar") {
      form.reset({
        etiqueta: `${nombreDeRol(modo.origen)} (copia)`,
        descripcion: modo.origen.descripcion ?? "",
        permisos: modo.origen.permisos,
      });
    } else {
      form.reset({ etiqueta: "", descripcion: "", permisos: [] });
    }
  }, [open, modo, form]);

  function onSubmit(values: RolFormInput) {
    guardar.mutate(
      {
        id: modo.tipo === "editar" ? modo.rol.id : undefined,
        clonar_de: modo.tipo === "clonar" ? modo.origen.id : undefined,
        etiqueta: values.etiqueta,
        descripcion: values.descripcion,
        permisos: values.permisos,
      },
      {
        onSuccess: () => onOpenChange(false),
        onError: (e: ApiError) => {
          if (!e.errors) return;
          for (const [campo, msgs] of Object.entries(e.errors)) {
            // `permisos.*` (un permiso suelto inválido) se ancla al campo `permisos`,
            // que es donde el usuario puede corregirlo.
            const destino = campo.startsWith("permisos") ? "permisos" : campo;
            if (["etiqueta", "descripcion", "permisos"].includes(destino)) {
              form.setError(destino as keyof RolFormInput, { message: msgs[0] });
            }
          }
        },
      },
    );
  }

  const titulo =
    modo.tipo === "editar"
      ? "Editar rol"
      : modo.tipo === "clonar"
        ? `Clonar ${nombreDeRol(modo.origen)}`
        : "Crear rol";

  const descripcion =
    modo.tipo === "clonar"
      ? "Parte de una copia con los mismos permisos y ajústala. El rol original no se modifica."
      : "Define qué puede hacer quien tenga este rol. Podrás cambiarlo después.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="etiqueta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del rol</FormLabel>
                  <FormControl>
                    <Input autoFocus placeholder="Cajero nocturno" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Cobra y cierra el turno de noche." {...field} />
                  </FormControl>
                  <FormDescription>
                    Ayuda a recordar para qué existe este rol.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="permisos"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-baseline justify-between">
                    <FormLabel>Permisos</FormLabel>
                    {/* El conteo sale de `field.value` y no de `form.watch`: watch()
                        no es memoizable y hace que el compilador salte el componente. */}
                    <span className="text-xs text-text-muted tabular-nums">
                      {field.value.length} seleccionados
                    </span>
                  </div>

                  {catalogo.isError ? (
                    <ErrorState
                      error={catalogo.error}
                      onRetry={() => catalogo.refetch()}
                    />
                  ) : (
                    <div className="max-h-[45vh] overflow-y-auto pr-1">
                      {catalogo.isLoading ? (
                        <p className="py-6 text-center text-sm text-text-muted">
                          Cargando permisos…
                        </p>
                      ) : (
                        <SelectorPermisos
                          grupos={catalogo.data ?? []}
                          valor={field.value}
                          onChange={field.onChange}
                          disabled={guardar.isPending}
                        />
                      )}
                    </div>
                  )}
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
              <Button type="submit" disabled={guardar.isPending || catalogo.isLoading}>
                {guardar.isPending
                  ? "Guardando…"
                  : esEdicion
                    ? "Guardar cambios"
                    : "Crear rol"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
