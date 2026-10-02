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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ApiError } from "@/lib/api/types";
import { TIPOS_IMPRESORA } from "../constants";
import { impresoraSchema, type ImpresoraInput } from "../schemas";
import { useGuardarImpresora } from "../api";
import type { ImpresoraRecurso } from "../types";

interface ImpresoraFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Impresora a editar; si es undefined, es alta. */
  impresora?: ImpresoraRecurso;
}

/**
 * Formulario de alta/edición de impresora en modal (M13). El `tipo` es un enum
 * fijo (barra|cocina|ticket). Los errores de validación del backend se mapean
 * sobre los campos.
 */
export function ImpresoraFormDialog({ open, onOpenChange, impresora }: ImpresoraFormDialogProps) {
  const esEdicion = Boolean(impresora);
  const guardar = useGuardarImpresora();

  const form = useForm<ImpresoraInput>({
    resolver: zodResolver(impresoraSchema),
    defaultValues: { nombre: "", tipo: "barra", conexion: "" },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      nombre: impresora?.nombre ?? "",
      tipo: (impresora?.tipo as ImpresoraInput["tipo"]) ?? "barra",
      conexion: impresora?.conexion ?? "",
    });
  }, [open, impresora, form]);

  function onSubmit(values: ImpresoraInput) {
    guardar.mutate(
      { id: impresora?.id, ...values },
      {
        onSuccess: () => onOpenChange(false),
        onError: (e: ApiError) => {
          if (e.errors) {
            for (const [campo, msgs] of Object.entries(e.errors)) {
              if (["nombre", "tipo", "conexion"].includes(campo)) {
                form.setError(campo as keyof ImpresoraInput, { message: msgs[0] });
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
          <DialogTitle>{esEdicion ? "Editar impresora" : "Nueva impresora"}</DialogTitle>
          <DialogDescription>
            {esEdicion
              ? "Actualiza los datos de la impresora."
              : "Registra una impresora para comandas o tickets."}
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
                    <Input autoFocus placeholder="Ej. Barra principal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TIPOS_IMPRESORA.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="conexion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conexión</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Opcional (ej. 192.168.1.50 o USB)"
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
