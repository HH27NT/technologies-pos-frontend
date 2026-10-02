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
import { InputNumerico } from "@/components/shared";
import { Button } from "@/components/ui/button";
import type { ApiError } from "@/lib/api/types";
import { abrirCajaSchema, type AbrirCajaInput } from "../schemas";
import { useAbrirCaja } from "../api";

interface AbrirCajaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Diálogo para abrir la caja (M10). Captura el monto inicial en efectivo. Al
 * confirmar, el hook actualiza `cajaAbierta` en el store (compuerta del POS).
 */
export function AbrirCajaDialog({ open, onOpenChange }: AbrirCajaDialogProps) {
  const abrir = useAbrirCaja();

  const form = useForm<AbrirCajaInput>({
    resolver: zodResolver(abrirCajaSchema),
    defaultValues: { monto_inicial: 0 },
  });

  useEffect(() => {
    if (open) form.reset({ monto_inicial: 0 });
  }, [open, form]);

  function onSubmit(values: AbrirCajaInput) {
    abrir.mutate(values, {
      onSuccess: () => onOpenChange(false),
      onError: (e: ApiError) => {
        if (e.errors?.monto_inicial) {
          form.setError("monto_inicial", { message: e.errors.monto_inicial[0] });
        }
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Abrir caja</DialogTitle>
          <DialogDescription>
            Registra el efectivo con el que inicia el turno. Mientras la caja esté
            abierta se habilitan las ventas del POS.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="monto_inicial"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto inicial</FormLabel>
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
                  <FormDescription>Efectivo en el cajón al iniciar.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={abrir.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={abrir.isPending}>
                {abrir.isPending ? "Abriendo…" : "Abrir caja"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
