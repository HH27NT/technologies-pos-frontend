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
import { categoriaSchema, type CategoriaInput } from "../schemas";
import { useGuardarCategoria } from "../api";
import type { CategoriaRecurso } from "../types";

interface CategoriaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Categoría a editar; si es undefined, es alta. */
  categoria?: CategoriaRecurso;
  /** Posición que le toca a una categoría nueva: el final de la lista. */
  ordenSiguiente: number;
}

/**
 * Formulario de alta/edición de categoría en modal (M05). Los errores de
 * validación del backend se mapean sobre los campos.
 *
 * **No pregunta la posición.** Ordenar es comparar, y este modal tapa justo la
 * lista contra la que habría que comparar; además el valor correcto casi siempre
 * es "al final", que el sistema ya sabe calcular. La nueva se crea al final y el
 * orden se cambia en la tabla, con las flechas de cada fila. Al editar se
 * reenvía la posición que ya tenía, para no perderla.
 */
export function CategoriaFormDialog({
  open,
  onOpenChange,
  categoria,
  ordenSiguiente,
}: CategoriaFormDialogProps) {
  const esEdicion = Boolean(categoria);
  const guardar = useGuardarCategoria();

  const form = useForm<CategoriaInput>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: { nombre: "" },
  });

  // Rehidrata el formulario cada vez que se abre o cambia la categoría objetivo.
  useEffect(() => {
    if (!open) return;
    form.reset({ nombre: categoria?.nombre ?? "" });
  }, [open, categoria, form]);

  function onSubmit(values: CategoriaInput) {
    guardar.mutate(
      {
        id: categoria?.id,
        ...values,
        orden_display: categoria?.orden_display ?? ordenSiguiente,
      },
      {
        onSuccess: () => onOpenChange(false),
        onError: (e: ApiError) => {
          // Solo `nombre` es campo del formulario; cualquier otro error del backend
          // lo muestra el toast de la mutación.
          if (e.errors?.nombre) {
            form.setError("nombre", { message: e.errors.nombre[0] });
          }
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{esEdicion ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
          <DialogDescription>
            {esEdicion
              ? "Actualiza los datos de la categoría."
              : "Agrupa productos del menú. Se agrega al final; el orden se cambia en la lista."}
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
                    <Input autoFocus placeholder="Ej. Cervezas" {...field} />
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
