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
import { proveedorSchema, type ProveedorInput } from "../schemas";
import { useGuardarProveedor } from "../api";
import type { ProveedorRecurso } from "../types";

interface ProveedorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Proveedor a editar; si es undefined, es alta. */
  proveedor?: ProveedorRecurso;
}

/**
 * Formulario de alta/edición de proveedor en modal (M08). Los errores de
 * validación del backend se mapean sobre los campos.
 */
export function ProveedorFormDialog({
  open,
  onOpenChange,
  proveedor,
}: ProveedorFormDialogProps) {
  const esEdicion = Boolean(proveedor);
  const guardar = useGuardarProveedor();

  const form = useForm<ProveedorInput>({
    resolver: zodResolver(proveedorSchema),
    defaultValues: { nombre: "", telefono: "", email: "" },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      nombre: proveedor?.nombre ?? "",
      telefono: proveedor?.telefono ?? "",
      email: proveedor?.email ?? "",
    });
  }, [open, proveedor, form]);

  function onSubmit(values: ProveedorInput) {
    guardar.mutate(
      { id: proveedor?.id, ...values },
      {
        onSuccess: () => onOpenChange(false),
        onError: (e: ApiError) => {
          if (e.errors) {
            for (const [campo, msgs] of Object.entries(e.errors)) {
              if (["nombre", "telefono", "email"].includes(campo)) {
                form.setError(campo as keyof ProveedorInput, { message: msgs[0] });
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
          <DialogTitle>{esEdicion ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle>
          <DialogDescription>
            {esEdicion
              ? "Actualiza los datos del proveedor."
              : "Registra un proveedor para asociarlo a tus insumos."}
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
                    <Input autoFocus placeholder="Ej. Distribuidora Modelo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
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
                      <Input
                        type="email"
                        placeholder="Opcional"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
