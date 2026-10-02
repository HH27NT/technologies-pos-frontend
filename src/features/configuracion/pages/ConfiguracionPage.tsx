import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageHeader, ErrorState, InputNumerico } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { useCan } from "@/lib/auth";
import type { ApiError } from "@/lib/api/types";
import { useConfiguracion, useGuardarConfiguracion } from "../api";
import { configuracionSchema, type ConfiguracionInput } from "../schemas";
import type { ConfiguracionRecurso } from "../types";

/**
 * Pantalla de Configuración del establecimiento (M03). Form inline (singleton).
 * Datos del ticket, impresión automática, impuesto y umbral global de stock.
 * Todo gateado por `configuracion.editar`; el super admin no tiene tenant y queda
 * excluido en la ruta y en la nav.
 */
export function ConfiguracionPage() {
  const puedeEditar = useCan("configuracion.editar");
  const configQuery = useConfiguracion();
  const guardar = useGuardarConfiguracion();

  const form = useForm<ConfiguracionInput>({
    resolver: zodResolver(configuracionSchema),
    defaultValues: {
      nombre_comercial: "",
      telefono_ticket: "",
      direccion_ticket: "",
      impresion_automatica: false,
      terminal_compartida: false,
      bloqueo_terminal_segundos: 120,
      stock_minimo_global: null,
      aplica_impuesto: false,
      tasa_impuesto: null,
    },
  });

  // El auto-bloqueo solo tiene sentido con el modo activo; se oculta si está apagado.
  // `useWatch` y no `form.watch()`: este último no es memoizable y el compilador de
  // React se salta el componente entero (warning de eslint).
  const terminalCompartida = useWatch({ control: form.control, name: "terminal_compartida" });
  const config = configQuery.data;
  useEffect(() => {
    if (!config) return;
    form.reset(aFormValues(config));
  }, [config, form]);

  function onSubmit(values: ConfiguracionInput) {
    guardar.mutate(
      {
        nombre_comercial: vacioANull(values.nombre_comercial),
        telefono_ticket: vacioANull(values.telefono_ticket),
        direccion_ticket: vacioANull(values.direccion_ticket),
        impresion_automatica: values.impresion_automatica,
        terminal_compartida: values.terminal_compartida,
        bloqueo_terminal_segundos: values.bloqueo_terminal_segundos,
        stock_minimo_global: values.stock_minimo_global,
        aplica_impuesto: values.aplica_impuesto,
        tasa_impuesto: values.tasa_impuesto,
      },
      {
        onError: (e: ApiError) => {
          if (e.errors) {
            for (const [campo, msgs] of Object.entries(e.errors)) {
              if (campo in form.getValues()) {
                form.setError(campo as keyof ConfiguracionInput, { message: msgs[0] });
              }
            }
          }
        },
      },
    );
  }

  if (configQuery.isError) {
    return (
      <>
        <PageHeader title="Configuración" description="Ajustes del establecimiento." />
        <ErrorState error={configQuery.error} onRetry={() => configQuery.refetch()} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Configuración"
        description="Datos del ticket, impresión, impuesto y umbral de existencias del establecimiento."
      />

      <Form {...form}>
        {/* `noValidate`: sin él, la validación nativa de los `min`/`max`/`step` de los
            inputs numéricos aborta el envío ANTES de React, sin mensaje propio y en el
            idioma del navegador. La autoridad local es Zod, y sus mensajes se ven inline. */}
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ticket de cobro</CardTitle>
              <CardDescription>
                Aparecen impresos en el recibo que se entrega al cliente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="nombre_comercial"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre comercial</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej. Bar Demo"
                        disabled={!puedeEditar}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="telefono_ticket"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono del ticket</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Opcional"
                        disabled={!puedeEditar}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="direccion_ticket"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección del ticket</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Opcional"
                        disabled={!puedeEditar}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="impresion_automatica"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Impresión automática</FormLabel>
                      <FormDescription>
                        Imprime el ticket automáticamente al cobrar la orden.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!puedeEditar}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Terminal compartida</CardTitle>
              <CardDescription>
                Para locales donde varios meseros usan la misma tablet. Cada quien teclea su PIN
                para que la venta quede a su nombre.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="terminal_compartida"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Pedir PIN de mesero</FormLabel>
                      <FormDescription>
                        El POS pide PIN al abrir la orden y siempre al cobrar. Si tus meseros
                        entran con su propia cuenta, déjalo apagado.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!puedeEditar}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              {terminalCompartida && (
                <FormField
                  control={form.control}
                  name="bloqueo_terminal_segundos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bloqueo por inactividad (segundos)</FormLabel>
                      <FormControl>
                        <InputNumerico
                          decimales={0}
                          placeholder="120"
                          disabled={!puedeEditar}
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormDescription>
                        Tras ese tiempo sin actividad, la terminal vuelve a pedir el PIN. Las
                        órdenes abiertas se conservan.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Impuesto</CardTitle>
              <CardDescription>
                Los totales se congelan en el backend; esto solo define la tasa.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="aplica_impuesto"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Aplica impuesto</FormLabel>
                      <FormDescription>Las órdenes calculan impuesto sobre el subtotal.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!puedeEditar}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tasa_impuesto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tasa de impuesto (%)</FormLabel>
                    <FormControl>
                      <InputNumerico
                        decimales={2}
                        vacio={null}
                        placeholder="Ej. 16"
                        disabled={!puedeEditar}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inventario</CardTitle>
              <CardDescription>Umbral por defecto para marcar existencias bajas.</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="stock_minimo_global"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock mínimo global</FormLabel>
                    <FormControl>
                      <InputNumerico
                        decimales={0}
                        vacio={null}
                        placeholder="Sin umbral"
                        disabled={!puedeEditar}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>Déjalo vacío para no marcar stock bajo por defecto.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {puedeEditar && (
            <div className="flex justify-end">
              <Button type="submit" disabled={guardar.isPending || configQuery.isLoading}>
                {guardar.isPending ? "Guardando…" : "Guardar cambios"}
              </Button>
            </div>
          )}
        </form>
      </Form>
    </>
  );
}

/** Convierte cadena vacía a null (el backend distingue "sin valor" de ""). */
function vacioANull(v: string): string | null {
  const t = v.trim();
  return t === "" ? null : t;
}

/** Mapea el Resource del backend a los valores del formulario. Los decimales
 * llegan como string ("16.00"); se coercionan a número para el input (regla #6:
 * solo se muestran, no se recalculan). */
function aFormValues(c: ConfiguracionRecurso): ConfiguracionInput {
  return {
    nombre_comercial: c.nombre_comercial ?? "",
    telefono_ticket: c.telefono_ticket ?? "",
    direccion_ticket: c.direccion_ticket ?? "",
    impresion_automatica: c.impresion_automatica,
    terminal_compartida: c.terminal_compartida,
    bloqueo_terminal_segundos: c.bloqueo_terminal_segundos,
    stock_minimo_global: aNumero(c.stock_minimo_global),
    aplica_impuesto: c.aplica_impuesto,
    tasa_impuesto: aNumero(c.tasa_impuesto),
  };
}

/** Convierte el decimal-string del backend a número (o null). */
function aNumero(v: number | string | null): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}
