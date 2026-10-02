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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ApiError } from "@/lib/api/types";
import type { UnidadRecurso } from "@/features/unidades";
import type { ProveedorRecurso } from "@/features/proveedores";
import { insumoSchema, type InsumoInput } from "../schemas";
import { useGuardarInsumo } from "../api";
import type { InsumoRecurso } from "../types";

interface InsumoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Insumo a editar; si es undefined, es alta. */
  insumo?: InsumoRecurso;
  unidades: UnidadRecurso[];
  proveedores: ProveedorRecurso[];
}

const SIN_PROVEEDOR = "0";

/**
 * Formulario de alta/edición de insumo en modal (M08). El `stock_actual` NO se
 * edita directamente aquí (es read-only, se mueve con movimientos); al crear se
 * puede capturar `stock_inicial`, que el backend traduce a una entrada real (no
 * es un campo del insumo, por eso solo se ofrece en alta). Los errores de
 * validación del backend se mapean sobre los campos.
 */
export function InsumoFormDialog({
  open,
  onOpenChange,
  insumo,
  unidades,
  proveedores,
}: InsumoFormDialogProps) {
  const esEdicion = Boolean(insumo);
  const guardar = useGuardarInsumo();

  const form = useForm<InsumoInput>({
    resolver: zodResolver(insumoSchema),
    defaultValues: {
      nombre: "",
      id_unidad_medida: 0,
      tipo: "controlado",
      stock_minimo: undefined,
      costo_unitario: undefined,
      id_proveedor: undefined,
      stock_inicial: undefined,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      nombre: insumo?.nombre ?? "",
      id_unidad_medida: insumo?.id_unidad_medida ?? 0,
      // La mayoría de los insumos se descuentan por receta; los de tanteo son la
      // excepción, así que el alta arranca en "controlado".
      tipo: insumo?.tipo ?? "controlado",
      stock_minimo: insumo?.stock_minimo != null ? Number(insumo.stock_minimo) : undefined,
      costo_unitario:
        insumo?.costo_unitario != null ? Number(insumo.costo_unitario) : undefined,
      id_proveedor: insumo?.id_proveedor ?? undefined,
      stock_inicial: undefined,
    });
  }, [open, insumo, form]);

  function onSubmit(values: InsumoInput) {
    guardar.mutate(
      { id: insumo?.id, ...values },
      {
        onSuccess: () => onOpenChange(false),
        onError: (e: ApiError) => {
          if (e.errors) {
            const campos = [
              "nombre",
              "id_unidad_medida",
              "tipo",
              "stock_minimo",
              "costo_unitario",
              "id_proveedor",
              "stock_inicial",
            ];
            for (const [campo, msgs] of Object.entries(e.errors)) {
              if (campos.includes(campo)) {
                form.setError(campo as keyof InsumoInput, { message: msgs[0] });
              }
            }
          }
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{esEdicion ? "Editar insumo" : "Nuevo insumo"}</DialogTitle>
          <DialogDescription>
            {esEdicion
              ? "Actualiza los datos del insumo. La existencia se ajusta con movimientos."
              : "Crea un insumo. Si ya tienes existencia, captúrala abajo; si no, se registra después con un movimiento."}
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
                    <Input autoFocus placeholder="Ej. Cerveza Corona 355" {...field} />
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
                  <FormLabel>Cómo se descuenta</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="controlado">Por receta, al vender</SelectItem>
                      <SelectItem value="consumo">Por conteo físico</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {field.value === "consumo"
                      ? "No se descontará al vender y no podrá usarse en recetas. Es para lo que se echa al tanteo —chamoy, sal, hielo—: una cantidad inventada en la receta desviaría todo el inventario. Su existencia se corrige contando."
                      : "Cada venta descuenta lo que diga la receta del producto."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="id_unidad_medida"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidad de medida</FormLabel>
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una unidad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {unidades.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.nombre}
                            {u.abreviacion ? ` (${u.abreviacion})` : ""}
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
                name="id_proveedor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proveedor</FormLabel>
                    <Select
                      value={field.value ? String(field.value) : SIN_PROVEEDOR}
                      onValueChange={(v) =>
                        field.onChange(v === SIN_PROVEEDOR ? undefined : Number(v))
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Opcional" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={SIN_PROVEEDOR}>Sin proveedor</SelectItem>
                        {proveedores.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="stock_minimo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock mínimo</FormLabel>
                    <FormControl>
                      <InputNumerico
                        decimales={3}
                        placeholder="Opcional"
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>Avisa cuando la existencia baje de aquí.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {!esEdicion && (
              <FormField
                control={form.control}
                name="stock_inicial"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Existencia inicial</FormLabel>
                    <FormControl>
                      <InputNumerico
                        decimales={3}
                        placeholder="Opcional"
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      Cuánto tienes ahora mismo. Se registra como una entrada, para no
                      tener que abrir "Registrar movimiento" aparte.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
