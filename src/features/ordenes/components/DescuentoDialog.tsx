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
import { InputNumerico } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import type { ApiError } from "@/lib/api/types";
import { descuentoSchema, type DescuentoInput } from "../schemas";
import { useAplicarDescuento } from "../api";
import type { Orden } from "../types";

interface DescuentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orden: Orden;
}

/**
 * Diálogo para aplicar un descuento a la orden (M11). El descuento es un monto
 * absoluto; el backend recalcula el total (regla #6, no se recalcula en el front).
 */
export function DescuentoDialog({ open, onOpenChange, orden }: DescuentoDialogProps) {
  const aplicar = useAplicarDescuento();

  const form = useForm<DescuentoInput>({
    resolver: zodResolver(descuentoSchema),
    defaultValues: { descuento: 0 },
  });

  useEffect(() => {
    if (open) form.reset({ descuento: Number(orden.descuento) || 0 });
  }, [open, orden.descuento, form]);

  function onSubmit(values: DescuentoInput) {
    aplicar.mutate(
      { idOrden: orden.id, descuento: values.descuento },
      {
        onSuccess: () => onOpenChange(false),
        onError: (e: ApiError) => {
          if (e.errors?.descuento) {
            form.setError("descuento", { message: e.errors.descuento[0] });
          }
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Aplicar descuento</DialogTitle>
          <DialogDescription>
            Monto de descuento sobre la orden. El total se recalcula en el servidor.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">
          <span className="text-text-muted">Subtotal</span>
          <span className="font-medium tabular-nums">{formatMoney(orden.subtotal)}</span>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="descuento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descuento</FormLabel>
                  <FormControl>
                    <InputNumerico
                      autoFocus
                      decimales={2}
                      placeholder="0.00"
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={aplicar.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={aplicar.isPending}>
                {aplicar.isPending ? "Aplicando…" : "Aplicar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
