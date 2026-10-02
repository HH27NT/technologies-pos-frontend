import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ApiError } from "@/lib/api/types";
import { useCan } from "@/lib/auth";
import {
  OverrideAutorizacionDialog,
  type TipoAutorizacion,
} from "@/features/autorizaciones";
import { movimientoSchema, type MovimientoInput } from "../schemas";
import { useRegistrarMovimiento } from "../api";
import type { InsumoRecurso, TipoMovimiento } from "../types";

interface MovimientoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Insumo sobre el que se registra el movimiento. */
  insumo?: InsumoRecurso;
}

/** Permiso directo requerido por cada tipo de movimiento (regla de oro #7). */
const PERMISO_POR_TIPO: Record<TipoMovimiento, string> = {
  entrada: "inventario.entrada",
  ajuste: "inventario.ajustar",
  merma: "inventario.merma",
};

/**
 * `tipo` de autorización que espera el backend por cada tipo de movimiento. Solo
 * entrada y ajuste son autorizables: la merma es permiso directo del operador, así
 * que no tiene tipo de autorización.
 */
const TIPO_AUTORIZACION_POR_MOVIMIENTO: Partial<Record<TipoMovimiento, TipoAutorizacion>> = {
  entrada: "entrada_stock",
  ajuste: "ajuste_stock",
};

const ETIQUETA_TIPO: Record<TipoMovimiento, string> = {
  entrada: "Entrada",
  ajuste: "Ajuste",
  merma: "Merma",
};

/**
 * Tipos que ofrece este diálogo. "Ajuste" existía como opción aparte pero hacía
 * prácticamente lo mismo que "Entrada" (ambos suman al stock; la única diferencia
 * real era si el motivo era obligatorio) — confundía más de lo que distinguía, así
 * que se fusionaron: toda alta de existencia entra por "Entrada", con motivo
 * siempre opcional. El backend conserva `ajuste` como tipo válido (compatibilidad
 * con el histórico y con `inventario.ajustar`), simplemente este diálogo ya no lo
 * ofrece.
 */
const TIPOS: TipoMovimiento[] = ["entrada", "merma"];

/**
 * Diálogo para registrar un movimiento de inventario (M08). El tipo se gatea por
 * permiso directo (`inventario.<tipo>`); donde el operador no lo tiene (entrada),
 * la acción se ejecuta con override: un admin teclea su PIN en
 * `OverrideAutorizacionDialog` y queda registrada (M14.1). El admin tiene ambos.
 */
export function MovimientoDialog({ open, onOpenChange, insumo }: MovimientoDialogProps) {
  const registrar = useRegistrarMovimiento();
  const puedeSolicitar = useCan("autorizaciones.solicitar");
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [pendiente, setPendiente] = useState<MovimientoInput | undefined>();

  const puede: Record<TipoMovimiento, boolean> = {
    entrada: useCan(PERMISO_POR_TIPO.entrada),
    ajuste: useCan(PERMISO_POR_TIPO.ajuste),
    merma: useCan(PERMISO_POR_TIPO.merma),
  };

  const form = useForm<MovimientoInput>({
    resolver: zodResolver(movimientoSchema),
    defaultValues: { tipo: "entrada", cantidad: undefined, motivo: "", costo_unitario: undefined },
  });

  useEffect(() => {
    if (!open) return;
    // Preselecciona el primer tipo que el usuario sí puede hacer directo.
    const tipoInicial = TIPOS.find((t) => puede[t]) ?? "entrada";
    // Si el insumo ya tiene un costo unitario guardado, se precarga: es el costo más
    // probable de la próxima entrada y evita volver a pedirlo cada vez. Sigue editable.
    const costoInicial =
      insumo?.costo_unitario != null ? Number(insumo.costo_unitario) : undefined;
    form.reset({ tipo: tipoInicial, cantidad: undefined, motivo: "", costo_unitario: costoInicial });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, insumo]);

  const tipoActual = form.watch("tipo");
  const puedeTipoActual = puede[tipoActual];
  /** Tipo que espera M14 para el respaldo asíncrono del movimiento pendiente. */
  const tipoAutorizacion = pendiente
    ? TIPO_AUTORIZACION_POR_MOVIMIENTO[pendiente.tipo]
    : undefined;
  // El operador sin permiso directo puede pedir override (solo entrada/ajuste tienen
  // ese flujo; merma no lo requiere porque el operador ya la tiene directa).
  const tieneOverride = tipoActual === "entrada" || tipoActual === "ajuste";
  const puedeOverride = !puedeTipoActual && puedeSolicitar && tieneOverride;
  const enviando = registrar.isPending;

  function mapErrores(e: ApiError) {
    if (!e.errors) return;
    for (const [campo, msgs] of Object.entries(e.errors)) {
      if (["tipo", "cantidad", "motivo", "costo_unitario"].includes(campo)) {
        form.setError(campo as keyof MovimientoInput, { message: msgs[0] });
      }
    }
  }

  function onSubmit(values: MovimientoInput) {
    if (!insumo) return;

    // Registro directo (admin o permiso del tipo).
    if (puedeTipoActual) {
      registrar.mutate(
        {
          id_insumo: insumo.id,
          tipo: values.tipo,
          cantidad: values.cantidad,
          motivo: values.motivo,
          costo_unitario: values.tipo === "entrada" ? values.costo_unitario : undefined,
        },
        { onSuccess: () => onOpenChange(false), onError: mapErrores },
      );
      return;
    }

    // Override: el formulario es válido (cantidad ok); pide el PIN del admin.
    if (puedeOverride) {
      setPendiente(values);
      setOverrideOpen(true);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar movimiento</DialogTitle>
          <DialogDescription>
            {insumo
              ? `${insumo.nombre} · existencia actual ${insumo.stock_actual} ${insumo.unidad_medida?.abreviacion ?? ""}`
              : "Ajusta la existencia del insumo."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TIPOS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {ETIQUETA_TIPO[t]}
                          {!puede[t] ? " · requiere autorización" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Entrada suma existencia (compra o conteo a favor); merma resta
                    (rotura, derrame, consumo).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cantidad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cantidad</FormLabel>
                  <FormControl>
                    <InputNumerico
                      autoFocus
                      decimales={3}
                      placeholder="0"
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

            {tipoActual === "entrada" && (
              <FormField
                control={form.control}
                name="costo_unitario"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Costo unitario</FormLabel>
                    <FormControl>
                      <InputNumerico
                        decimales={2}
                        placeholder="Opcional"
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    {insumo?.costo_unitario != null && (
                      <FormDescription>
                        Precargado con el último costo guardado del insumo. Cámbialo si
                        esta compra costó distinto.
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {puedeTipoActual && (
              <FormField
                control={form.control}
                name="motivo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo</FormLabel>
                    <FormControl>
                      <Input placeholder="Opcional" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {puedeOverride && (
              <p className="rounded-md bg-info-bg px-3 py-2 text-sm text-info">
                No tienes permiso directo para este tipo. Un administrador deberá autorizarlo
                con su PIN; se registrará el motivo.
              </p>
            )}
            {!puedeTipoActual && !puedeOverride && (
              <p className="rounded-md bg-warning-bg px-3 py-2 text-sm text-warning">
                No tienes permiso para este tipo de movimiento.
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={enviando}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={enviando || (!puedeTipoActual && !puedeOverride)}
              >
                {puedeTipoActual
                  ? enviando
                    ? "Registrando…"
                    : "Registrar"
                  : "Autorizar con PIN"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      {/* Override: un admin autoriza con su PIN el movimiento del operador. */}
      <OverrideAutorizacionDialog
        open={overrideOpen}
        onOpenChange={setOverrideOpen}
        descripcion={
          pendiente
            ? `Un administrador autoriza con su PIN ${ETIQUETA_TIPO[pendiente.tipo].toLowerCase()} de ${pendiente.cantidad} para "${insumo?.nombre}".`
            : undefined
        }
        ejecutar={(autorizacion) => {
          if (!insumo || !pendiente) return Promise.reject(new Error("Sin datos"));
          return registrar.mutateAsync({
            id_insumo: insumo.id,
            tipo: pendiente.tipo,
            cantidad: pendiente.cantidad,
            motivo: autorizacion.motivo,
            costo_unitario: pendiente.tipo === "entrada" ? pendiente.costo_unitario : undefined,
            autorizacion,
          });
        }}
        solicitud={
          insumo && pendiente && tipoAutorizacion
            ? {
                tipo: tipoAutorizacion,
                refs: {
                  id_insumo: insumo.id,
                  cantidad: pendiente.cantidad,
                  ...(pendiente.tipo === "entrada" && pendiente.costo_unitario != null
                    ? { costo_unitario: pendiente.costo_unitario }
                    : {}),
                },
              }
            : undefined
        }
        onAutorizada={() => onOpenChange(false)}
        onSolicitada={() => onOpenChange(false)}
      />
    </Dialog>
  );
}
