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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { InputNumerico } from "@/components/shared";
import { Button } from "@/components/ui/button";
import type { ApiError } from "@/lib/api/types";
import { mesaSchema, type MesaInput } from "../schemas";
import { useGuardarMesa } from "../api";
import type { MesaRecurso } from "../types";

interface MesaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Mesa a editar; si es undefined, es alta. */
  mesa?: MesaRecurso;
}

/**
 * Formulario de alta/edición de mesa en modal (M09). Los errores de validación
 * del backend se mapean sobre los campos.
 */
export function MesaFormDialog({ open, onOpenChange, mesa }: MesaFormDialogProps) {
  const esEdicion = Boolean(mesa);
  const guardar = useGuardarMesa();

  const form = useForm<MesaInput>({
    resolver: zodResolver(mesaSchema),
    defaultValues: { numero: 0, nombre: "", zona: "", capacidad: undefined },
  });

  // Rehidrata el formulario cada vez que se abre o cambia la mesa objetivo.
  useEffect(() => {
    if (!open) return;
    form.reset({
      numero: mesa?.numero ?? 0,
      nombre: mesa?.nombre ?? "",
      zona: mesa?.zona ?? "",
      capacidad: mesa?.capacidad ?? undefined,
    });
  }, [open, mesa, form]);

  function onSubmit(values: MesaInput) {
    guardar.mutate(
      { id: mesa?.id, ...values },
      {
        onSuccess: () => onOpenChange(false),
        onError: (e: ApiError) => {
          if (e.errors) {
            for (const [campo, msgs] of Object.entries(e.errors)) {
              if (["numero", "nombre", "zona", "capacidad"].includes(campo)) {
                form.setError(campo as keyof MesaInput, { message: msgs[0] });
              }
            }
          }
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{esEdicion ? "Editar mesa" : "Nueva mesa"}</DialogTitle>
          <DialogDescription>
            {esEdicion
              ? "Actualiza los datos de la mesa."
              : "Crea una mesa para asignar órdenes en el POS."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="numero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número</FormLabel>
                    <FormControl>
                      <InputNumerico
                        autoFocus
                        decimales={0}
                        placeholder="1"
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="capacidad"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacidad</FormLabel>
                    <FormControl>
                      <InputNumerico
                        decimales={0}
                        placeholder="Opcional"
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Opcional (ej. Terraza 1)"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="zona"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zona</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Opcional (ej. Terraza)"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
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
