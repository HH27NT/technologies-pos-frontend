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
import { Button } from "@/components/ui/button";
import type { ApiError } from "@/lib/api/types";
import { unidadSchema, type UnidadInput } from "../schemas";
import { useGuardarUnidad } from "../api";
import type { UnidadRecurso } from "../types";

interface UnidadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Unidad a editar; si es undefined, es alta. */
  unidad?: UnidadRecurso;
}

/**
 * Formulario de alta/edición de unidad de medida en modal (M08). Los errores de
 * validación del backend se mapean sobre los campos.
 */
export function UnidadFormDialog({ open, onOpenChange, unidad }: UnidadFormDialogProps) {
  const esEdicion = Boolean(unidad);
  const guardar = useGuardarUnidad();

  const form = useForm<UnidadInput>({
    resolver: zodResolver(unidadSchema),
    defaultValues: { nombre: "", abreviacion: "" },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      nombre: unidad?.nombre ?? "",
      abreviacion: unidad?.abreviacion ?? "",
    });
  }, [open, unidad, form]);

  function onSubmit(values: UnidadInput) {
    guardar.mutate(
      { id: unidad?.id, ...values },
      {
        onSuccess: () => onOpenChange(false),
        onError: (e: ApiError) => {
          if (e.errors) {
            for (const [campo, msgs] of Object.entries(e.errors)) {
              if (["nombre", "abreviacion"].includes(campo)) {
                form.setError(campo as keyof UnidadInput, { message: msgs[0] });
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
          <DialogTitle>{esEdicion ? "Editar unidad" : "Nueva unidad"}</DialogTitle>
          <DialogDescription>
            {esEdicion
              ? "Actualiza los datos de la unidad de medida."
              : "Crea una unidad de medida para tus insumos (ej. caja, litro)."}
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
                    <Input autoFocus placeholder="Ej. Caja 24" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="abreviacion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Abreviación</FormLabel>
                  <FormControl>
                    <Input placeholder="Opcional (ej. cja24)" {...field} value={field.value ?? ""} />
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
