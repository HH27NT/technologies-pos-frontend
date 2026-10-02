import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck } from "lucide-react";
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
import { isApiError } from "@/lib/api/types";
import { useCan } from "@/lib/auth";
import { useSolicitarAutorizacion } from "../api";
import { overrideSchema, type OverrideInput } from "../schemas";
import type { AutorizacionOverride, SolicitudAutorizacion } from "../types";
import { PinInput } from "./PinInput";

interface OverrideAutorizacionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Contexto de qué se autoriza (se muestra al operador). */
  descripcion?: string;
  /**
   * Ejecuta la operación sensible con el bloque de override. Debe devolver una
   * promesa (p. ej. `mutation.mutateAsync(...)`); el diálogo espera, cierra en éxito
   * y muestra el mensaje del backend (422/403/429) en caso de error.
   */
  ejecutar: (bloque: AutorizacionOverride) => Promise<unknown>;
  /** Se llama cuando el override EJECUTÓ la operación (PIN válido). */
  onAutorizada?: () => void;
  /**
   * Se llama cuando se usó el respaldo asíncrono: la solicitud quedó PENDIENTE y la
   * operación NO se ejecutó. No es lo mismo que `onAutorizada` (p. ej. tras anular
   * por override se sale de la orden; tras solicitarlo, la orden sigue abierta).
   */
  onSolicitada?: () => void;
  /**
   * Datos de la operación para el RESPALDO asíncrono (POST /autorizaciones), que se
   * ofrece cuando no hay un admin cerca para teclear su PIN. Sin esto, el diálogo
   * solo ofrece el override.
   */
  solicitud?: SolicitudAutorizacion;
  /** Terminal del POS, si se conoce. Solo alimenta la bitácora de intentos. */
  terminal?: string;
}

/**
 * Diálogo de override de autorización por PIN (M14.1). El operador teclea el PIN de 6
 * dígitos de un admin y el motivo; el backend resuelve al autorizador dentro del
 * establecimiento, ejecuta la acción al instante y la registra en `autorizaciones`
 * (metodo=override). No pide credenciales de acceso, no inicia sesión del admin y no
 * guarda su token.
 *
 * Como respaldo (si no hay admin cerca) se conserva el flujo asíncrono: solicitar y
 * que el admin apruebe desde la bandeja.
 *
 * El formulario vive en `OverrideFormContent`, montado solo con el diálogo abierto:
 * así el PIN y el error se reinician limpios en cada apertura sin usar efectos, y el
 * PIN nunca sobrevive al cierre del modal.
 */
export function OverrideAutorizacionDialog({
  open,
  onOpenChange,
  descripcion,
  ejecutar,
  onAutorizada,
  onSolicitada,
  solicitud,
  terminal,
}: OverrideAutorizacionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            Autorización de administrador
          </DialogTitle>
          <DialogDescription>
            {descripcion ??
              "Un administrador debe autorizar esta operación con su PIN. Queda registrada."}
          </DialogDescription>
        </DialogHeader>

        {open && (
          <OverrideFormContent
            ejecutar={ejecutar}
            onClose={() => onOpenChange(false)}
            onAutorizada={onAutorizada}
            onSolicitada={onSolicitada}
            solicitud={solicitud}
            terminal={terminal}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface OverrideFormContentProps {
  ejecutar: (bloque: AutorizacionOverride) => Promise<unknown>;
  onClose: () => void;
  onAutorizada?: () => void;
  onSolicitada?: () => void;
  solicitud?: SolicitudAutorizacion;
  terminal?: string;
}

function OverrideFormContent({
  ejecutar,
  onClose,
  onAutorizada,
  onSolicitada,
  solicitud,
  terminal,
}: OverrideFormContentProps) {
  const [errorGeneral, setErrorGeneral] = useState<string | undefined>();
  const puedeSolicitar = useCan("autorizaciones.solicitar");
  const solicitar = useSolicitarAutorizacion();

  const form = useForm<OverrideInput>({
    resolver: zodResolver(overrideSchema),
    defaultValues: { autorizacion_pin: "", motivo: "" },
  });

  async function onSubmit(values: OverrideInput) {
    setErrorGeneral(undefined);
    try {
      await ejecutar({
        motivo: values.motivo,
        autorizacion_pin: values.autorizacion_pin,
        ...(terminal ? { terminal } : {}),
      });
      onAutorizada?.();
      onClose();
    } catch (e) {
      // 422 (PIN inválido), 403 (el autorizador no puede autorizar ESTO) o 429
      // (throttle). El `message` viene en español del backend y se muestra tal cual
      // (regla #2). El PIN se limpia siempre: un intento fallido no se reenvía tal
      // cual, y así no queda tecleado en pantalla.
      setErrorGeneral(isApiError(e) ? e.message : "No se pudo autorizar la operación");
      form.setValue("autorizacion_pin", "");
      form.setFocus("autorizacion_pin");
    }
  }

  /** Respaldo: sin admin cerca, se deja la solicitud pendiente en la bandeja. */
  function solicitarAprobacion() {
    const motivo = form.getValues("motivo").trim();
    if (!solicitud) return;
    if (!motivo) {
      form.setError("motivo", { message: "El motivo es obligatorio" });
      return;
    }

    solicitar.mutate(
      { tipo: solicitud.tipo, motivo, refs: solicitud.refs },
      {
        onSuccess: () => {
          onSolicitada?.();
          onClose();
        },
      },
    );
  }

  const enviando = form.formState.isSubmitting;
  const ocupado = enviando || solicitar.isPending;
  const ofreceRespaldo = Boolean(solicitud) && puedeSolicitar;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="autorizacion_pin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>PIN de administrador</FormLabel>
              <FormControl>
                <PinInput
                  autoFocus
                  disabled={ocupado}
                  name={field.name}
                  ref={field.ref}
                  value={field.value}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                  aria-label="PIN de administrador"
                />
              </FormControl>
              <FormDescription>6 dígitos. Lo teclea el administrador.</FormDescription>
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
                  autoComplete="off"
                  placeholder="Por qué se necesita esta operación"
                  disabled={ocupado}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {errorGeneral && (
          <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
            {errorGeneral}
          </p>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={ocupado}>
              Cancelar
            </Button>
            <Button type="submit" disabled={ocupado}>
              {enviando ? "Autorizando…" : "Autorizar y ejecutar"}
            </Button>
          </div>

          {ofreceRespaldo && (
            <button
              type="button"
              className="self-end text-sm text-brand-accent underline-offset-4 hover:underline disabled:opacity-50"
              disabled={ocupado}
              onClick={solicitarAprobacion}
            >
              {solicitar.isPending
                ? "Enviando solicitud…"
                : "¿No hay un administrador cerca? Solicitar aprobación"}
            </button>
          )}
        </DialogFooter>
      </form>
    </Form>
  );
}
