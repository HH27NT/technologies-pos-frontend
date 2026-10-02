import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck, ShieldOff } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared";
import { PinInput } from "@/features/autorizaciones/components/PinInput";
import { isApiError } from "@/lib/api/types";
import { formatFechaHora } from "@/lib/format";
import { useFijarMeseroPin, useMeseroPin, useQuitarMeseroPin } from "../api";
import { meseroPinSchema, type MeseroPinInput } from "../schemas";
import type { UsuarioRecurso } from "../types";

interface MeseroPinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Usuario cuyo PIN se administra; undefined mientras el diálogo está cerrado. */
  usuario?: UsuarioRecurso;
}

/**
 * PIN de mesero de un miembro del personal (terminal compartida).
 *
 * Lo fija **quien administra el personal**, al revés que el PIN de autorización
 * (M14.1, self-service): en una barra con tablet compartida el mesero muchas veces
 * no tiene credenciales propias con las que entrar a fijárselo. El riesgo está
 * acotado a propósito — este PIN **identifica, nunca autoriza**.
 *
 * El backend no devuelve el PIN jamás: la pantalla solo sabe si existe y desde
 * cuándo. Un PIN olvidado se reemplaza.
 */
export function MeseroPinDialog({ open, onOpenChange, usuario }: MeseroPinDialogProps) {
  const [porRetirar, setPorRetirar] = useState(false);

  const estado = useMeseroPin(open ? usuario?.id : undefined);
  const fijar = useFijarMeseroPin(usuario?.id);
  const quitar = useQuitarMeseroPin(usuario?.id);

  const form = useForm<MeseroPinInput>({
    resolver: zodResolver(meseroPinSchema),
    defaultValues: { pin: "", pin_confirmation: "" },
  });

  // Que cada apertura arranque en limpio NO se resuelve aquí con un efecto: el
  // padre remonta este diálogo con `key={usuario.id}`. Un efecto que llamara a
  // `form.reset()`/`fijar.reset()` tendría que depender de objetos que cambian de
  // identidad en cada render, y eso es un bucle infinito (lo fue).
  const configurado = estado.data?.configurado ?? false;

  /**
   * Aviso general del formulario, derivado del error de la mutación en vez de
   * copiado a estado propio: así se limpia solo al reintentar y no hay dos fuentes
   * de verdad. "PIN en uso" llega sin `errors` y es del formulario — no es culpa de
   * cómo se escribió el PIN, que es lo que sí va inline en el campo.
   */
  const errorGeneral = fijar.error
    ? isApiError(fijar.error)
      ? fijar.error.errors?.pin
        ? undefined
        : fijar.error.message
      : "No se pudo guardar el PIN"
    : undefined;

  function onSubmit(values: MeseroPinInput) {
    fijar.mutate(values.pin, {
      onSuccess: () => form.reset({ pin: "", pin_confirmation: "" }),
      onError: (e) => {
        const mensaje = isApiError(e) ? e.errors?.pin?.[0] : undefined;
        if (mensaje) form.setError("pin", { message: mensaje });
      },
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>PIN de mesero</DialogTitle>
            <DialogDescription>
              {usuario?.nombre} lo teclea en la terminal compartida para que la venta
              quede a su nombre. No da acceso ni autoriza nada.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3 rounded-lg border border-border p-3">
            {configurado ? (
              <ShieldCheck className="size-5 shrink-0 text-success" />
            ) : (
              <ShieldOff className="size-5 shrink-0 text-text-muted" />
            )}
            <div className="min-w-0">
              {estado.isLoading ? (
                <Badge variant="secondary">Cargando…</Badge>
              ) : configurado ? (
                <Badge variant="success">PIN configurado</Badge>
              ) : (
                <Badge variant="secondary">Sin configurar</Badge>
              )}
              <p className="mt-1 text-sm text-text-secondary">
                {configurado && estado.data?.actualizado_at
                  ? `Actualizado el ${formatFechaHora(estado.data.actualizado_at)}. Si lo olvidó, fija uno nuevo: el anterior no se puede consultar.`
                  : "Sin PIN no podrá firmar ventas en la terminal compartida."}
              </p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
              <FormField
                control={form.control}
                name="pin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PIN nuevo</FormLabel>
                    <FormControl>
                      <PinInput
                        disabled={fijar.isPending}
                        name={field.name}
                        ref={field.ref}
                        value={field.value}
                        onBlur={field.onBlur}
                        onChange={field.onChange}
                        aria-label="PIN nuevo"
                      />
                    </FormControl>
                    <FormDescription>
                      6 dígitos, distinto al de cualquier otro del establecimiento (es lo
                      único que los diferencia al teclear).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pin_confirmation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Repetir PIN</FormLabel>
                    <FormControl>
                      <PinInput
                        disabled={fijar.isPending}
                        name={field.name}
                        ref={field.ref}
                        value={field.value}
                        onBlur={field.onBlur}
                        onChange={field.onChange}
                        aria-label="Repetir PIN"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {errorGeneral && (
                <p
                  role="alert"
                  className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger"
                >
                  {errorGeneral}
                </p>
              )}

              <DialogFooter className="gap-2 sm:justify-between">
                {configurado ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="text-danger"
                    disabled={quitar.isPending}
                    onClick={() => setPorRetirar(true)}
                  >
                    Retirar PIN
                  </Button>
                ) : (
                  <span />
                )}
                <Button type="submit" disabled={fijar.isPending}>
                  {fijar.isPending
                    ? "Guardando…"
                    : configurado
                      ? "Cambiar PIN"
                      : "Establecer PIN"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={porRetirar}
        onOpenChange={setPorRetirar}
        title="Retirar PIN de mesero"
        description={`${usuario?.nombre} dejará de poder firmar ventas en la terminal compartida. Las órdenes que ya firmó conservan su atribución.`}
        confirmLabel="Retirar PIN"
        destructive
        loading={quitar.isPending}
        onConfirm={() =>
          quitar.mutate(undefined, {
            onSuccess: () => {
              setPorRetirar(false);
              form.reset({ pin: "", pin_confirmation: "" });
            },
          })
        }
      />
    </>
  );
}
