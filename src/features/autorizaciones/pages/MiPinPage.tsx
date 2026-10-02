import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { ConfirmDialog, ErrorState, PageHeader } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PasswordInput } from "@/components/ui/password-input";
import { isApiError } from "@/lib/api/types";
import { formatFechaHora } from "@/lib/format";
import { useEliminarPin, useGuardarPin, useMiPin } from "../api";
import { guardarPinSchema, type GuardarPinInput } from "../schemas";
import { PinInput } from "../components/PinInput";

/** Campos del formulario que el backend puede rechazar con `errors` (422). */
const CAMPOS_PIN = ["pin", "password_actual"] as const;

/**
 * PIN de autorización propio (M14.1, self-service). Cada autorizador fija y rota SU
 * PIN: ni el super admin ni otro admin lo hacen por él, para que el secreto no tenga
 * copia conocida por terceros. El backend nunca devuelve el PIN — esta pantalla solo
 * sabe si está configurado y desde cuándo.
 *
 * La ruta ya está gateada por PERMISOS_AUTORIZADOR (los 4 permisos sensibles) con
 * `excluirSuperAdmin`; aquí no se vuelve a comprobar.
 */
export function MiPinPage() {
  const [porEliminar, setPorEliminar] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | undefined>();

  const estado = useMiPin();
  const guardar = useGuardarPin();
  const eliminar = useEliminarPin();

  const form = useForm<GuardarPinInput>({
    resolver: zodResolver(guardarPinSchema),
    defaultValues: { pin: "", pin_confirmation: "", password_actual: "" },
  });

  const configurado = estado.data?.configurado ?? false;

  function onSubmit(values: GuardarPinInput) {
    setErrorGeneral(undefined);
    guardar.mutate(values, {
      onSuccess: () => form.reset(),
      onError: (e) => {
        if (!isApiError(e)) {
          setErrorGeneral("No se pudo guardar el PIN");
          return;
        }
        // Validación por campo (PIN trivial, contraseña incorrecta) → inline en el
        // campo. Lo demás (PIN ya en uso en el establecimiento) es de mensaje.
        let mapeado = false;
        for (const campo of CAMPOS_PIN) {
          const mensaje = e.errors?.[campo]?.[0];
          if (mensaje) {
            form.setError(campo, { message: mensaje });
            mapeado = true;
          }
        }
        if (!mapeado) setErrorGeneral(e.message);
      },
    });
  }

  if (estado.isError) {
    return (
      <>
        <PageHeader title="PIN de autorización" />
        <ErrorState error={estado.error} onRetry={() => estado.refetch()} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="PIN de autorización"
        description="Con este PIN autorizas operaciones sensibles de un operador (cancelar ítem, anular orden, entrada y ajuste de inventario) sin prestarle tu contraseña."
      />

      <div className="max-w-lg space-y-4">
        <Card className="flex items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            {configurado ? (
              <ShieldCheck className="size-5 text-success" />
            ) : (
              <ShieldOff className="size-5 text-text-muted" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Estado</span>
                {estado.isLoading ? (
                  <Badge variant="secondary">Cargando…</Badge>
                ) : configurado ? (
                  <Badge variant="success">PIN configurado</Badge>
                ) : (
                  <Badge variant="warning">Sin configurar</Badge>
                )}
              </div>
              <p className="mt-0.5 text-sm text-text-secondary">
                {configurado && estado.data?.actualizado_at
                  ? `Actualizado el ${formatFechaHora(estado.data.actualizado_at)}.`
                  : "Sin PIN no puedes autorizar operaciones en el momento; el operador tendrá que dejar la solicitud en la bandeja."}
              </p>
            </div>
          </div>

          {configurado && (
            <Button
              variant="outline"
              size="sm"
              className="text-danger"
              disabled={eliminar.isPending}
              onClick={() => setPorEliminar(true)}
            >
              <Trash2 />
              Eliminar
            </Button>
          )}
        </Card>

        <Card className="p-4">
          <div className="mb-4 flex items-center gap-2">
            <KeyRound className="size-5 text-primary" />
            <h2 className="font-display text-lg">
              {configurado ? "Cambiar PIN" : "Establecer PIN"}
            </h2>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="pin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PIN nuevo</FormLabel>
                    <FormControl>
                      <PinInput
                        disabled={guardar.isPending}
                        name={field.name}
                        ref={field.ref}
                        value={field.value}
                        onBlur={field.onBlur}
                        onChange={field.onChange}
                        aria-label="PIN nuevo"
                      />
                    </FormControl>
                    <FormDescription>
                      6 dígitos. Evita repetidos y secuencias; debe ser distinto del de
                      cualquier otro autorizador de este establecimiento.
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
                        disabled={guardar.isPending}
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

              <FormField
                control={form.control}
                name="password_actual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tu contraseña actual</FormLabel>
                    <FormControl>
                      <PasswordInput
                        autoComplete="current-password"
                        placeholder="Contraseña de acceso"
                        disabled={guardar.isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Confirma que eres tú quien fija el PIN, no alguien que encontró tu
                      sesión abierta.
                    </FormDescription>
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

              <div className="flex justify-end">
                <Button type="submit" disabled={guardar.isPending}>
                  {guardar.isPending
                    ? "Guardando…"
                    : configurado
                      ? "Cambiar PIN"
                      : "Establecer PIN"}
                </Button>
              </div>
            </form>
          </Form>
        </Card>
      </div>

      <ConfirmDialog
        open={porEliminar}
        onOpenChange={setPorEliminar}
        title="Eliminar PIN de autorización"
        description="Sin PIN no podrás autorizar operaciones en el momento: el operador tendrá que dejar la solicitud en la bandeja y tú aprobarla desde tu sesión. Puedes volver a fijar uno cuando quieras."
        confirmLabel="Eliminar PIN"
        destructive
        loading={eliminar.isPending}
        onConfirm={() =>
          eliminar.mutate(undefined, {
            onSuccess: () => {
              setPorEliminar(false);
              form.reset();
            },
          })
        }
      />
    </>
  );
}
