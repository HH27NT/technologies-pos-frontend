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
import { InputNumerico } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import type { ApiError } from "@/lib/api/types";
import { cerrarCajaSchema, type CerrarCajaInput } from "../schemas";
import { useCerrarCaja } from "../api";
import type { CajaSesion } from "../types";

interface CerrarCajaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Sesión de caja abierta que se va a cerrar. */
  sesion: CajaSesion;
}

/**
 * Diálogo para cerrar la caja (M10). Captura el efectivo contado y un motivo
 * opcional. El backend calcula la diferencia contra su monto de sistema; aquí no
 * se recalcula nada (regla #6). Al confirmar, el hook baja `cajaAbierta` en el store.
 */
export function CerrarCajaDialog({ open, onOpenChange, sesion }: CerrarCajaDialogProps) {
  const cerrar = useCerrarCaja();

  const form = useForm<CerrarCajaInput>({
    resolver: zodResolver(cerrarCajaSchema),
    defaultValues: { monto_contado: 0, motivo: "" },
  });

  useEffect(() => {
    if (open) form.reset({ monto_contado: 0, motivo: "" });
  }, [open, form]);

  function onSubmit(values: CerrarCajaInput) {
    cerrar.mutate(values, {
      onSuccess: () => onOpenChange(false),
      onError: (e: ApiError) => {
        if (e.errors) {
          for (const campo of ["monto_contado", "motivo"] as const) {
            if (e.errors[campo]) form.setError(campo, { message: e.errors[campo][0] });
          }
        }
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cerrar caja</DialogTitle>
          <DialogDescription>
            Cuenta el efectivo del cajón y regístralo. El sistema calculará la
            diferencia contra lo esperado.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">
          <span className="text-text-muted">Monto de apertura</span>
          <span className="font-medium tabular-nums">{formatMoney(sesion.monto_inicial)}</span>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="monto_contado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto contado</FormLabel>
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
                  <FormDescription>Efectivo real contado en el cajón.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="motivo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Opcional. Ej. explica un faltante o sobrante."
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
                disabled={cerrar.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" disabled={cerrar.isPending}>
                {cerrar.isPending ? "Cerrando…" : "Cerrar caja"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
