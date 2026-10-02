import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, ChevronRight, Plus, TriangleAlert } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCan } from "@/lib/auth";
import type { ApiError } from "@/lib/api/types";
import { formatMoney, normalizarTexto } from "@/lib/format";
import { useGuardarCategoria, type CategoriaRecurso } from "@/features/categorias";
import { useRecetas } from "@/features/recetas";
import { useUnidades, unidadPorDefecto } from "@/features/unidades";
import { productoSchema, type ProductoInput } from "../schemas";
import { useGuardarProducto, useProductos } from "../api";
import type { ProductoRecurso } from "../types";

interface ProductoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Producto a editar; si es undefined, es alta. */
  producto?: ProductoRecurso;
  /** Catálogo de categorías para el selector. */
  categorias: CategoriaRecurso[];
}

/**
 * Formulario de alta/edición de producto en modal (M06). El precio se captura como
 * número; el backend lo congela. Los errores de validación del backend se mapean
 * sobre los campos.
 *
 * **Camino corto (2026-09-04).** Arriba solo va lo que el POS necesita para vender:
 * nombre, categoría y precio. Descripción, costo, SKU e inventario viven detrás de
 * "Más opciones", porque de los siete campos solo tres son obligatorios y cargar un
 * menú de ochenta productos con los siete a la vista son cientos de decisiones que
 * nadie pidió. En edición la sección se abre sola si el producto ya trae alguno.
 */
export function ProductoFormDialog({
  open,
  onOpenChange,
  producto,
  categorias,
}: ProductoFormDialogProps) {
  const esEdicion = Boolean(producto);
  const guardar = useGuardarProducto();
  const guardarCategoria = useGuardarCategoria();
  const puedeCrearCategorias = useCan("categorias.gestionar");
  const puedeVerRecetas = useCan("recetas.gestionar");

  /**
   * `null` = el usuario no ha tocado la sección, así que manda el producto: si trae
   * datos avanzados se abre sola (esconder lo que se vino a editar sería absurdo) y
   * en un alta empieza cerrada. Se deriva en vez de sincronizarse con un efecto.
   */
  const [masOpcionesManual, setMasOpcionesManual] = useState<boolean | null>(null);
  const [creandoCategoria, setCreandoCategoria] = useState(false);
  const [nombreCategoria, setNombreCategoria] = useState("");
  /** Categorías creadas desde aquí; la lista del padre tarda un instante en refrescar. */
  const [categoriasNuevas, setCategoriasNuevas] = useState<CategoriaRecurso[]>([]);

  const form = useForm<ProductoInput>({
    resolver: zodResolver(productoSchema),
    defaultValues: {
      nombre: "",
      id_categoria: 0,
      precio_venta: 0,
      descripcion: "",
      costo_referencia: undefined,
      sku: "",
      controla_inventario: false,
    },
  });

  const controlaInventario = useWatch({ control: form.control, name: "controla_inventario" });
  const saleDelAlmacen = useWatch({ control: form.control, name: "sale_del_almacen" });

  /**
   * Aviso de nombre repetido. El catálogo **no** exige nombre único a propósito
   * (`DECISIONES.md` §5): una "Michelada" puede existir en dos categorías a distinto
   * precio. Pero sin variantes en el modelo, duplicar el nombre es la única forma de
   * tener dos precios, y el resultado son productos que el mesero no sabe distinguir y
   * un reporte que parte el mismo producto en dos renglones. Así que se **avisa** con
   * el dato que permite decidir —categoría y precio del que ya existe— y se deja
   * guardar: es advertencia, no error.
   *
   * Se pregunta al servidor en vez de traerse el catálogo entero: el índice ya busca
   * por nombre, y un alta no puede costar N páginas de productos.
   */
  const nombreTecleado = useWatch({ control: form.control, name: "nombre" });
  const [nombreABuscar, setNombreABuscar] = useState("");
  useEffect(() => {
    const termino = (nombreTecleado ?? "").trim();
    const id = setTimeout(() => setNombreABuscar(termino), 400);
    return () => clearTimeout(id);
  }, [nombreTecleado]);

  const homonimosQuery = useProductos(
    { buscar: nombreABuscar, per_page: 5 },
    { enabled: open && nombreABuscar.length >= 3 },
  );
  /** El que se llama **igual** (no el que se le parece): comparar normalizado. */
  const homonimo = useMemo(() => {
    const objetivo = normalizarTexto(nombreABuscar);
    if (objetivo === "") return undefined;
    return (homonimosQuery.data?.data ?? []).find(
      (p) => p.id !== producto?.id && normalizarTexto(p.nombre) === objetivo,
    );
  }, [homonimosQuery.data, nombreABuscar, producto?.id]);

  /**
   * El atajo necesita una unidad para el insumo que va a crear. No se pregunta: quien
   * da de alta una cerveza no está eligiendo unidad de medida, está diciendo "esto se
   * cuenta de una en una". Si no hubiera ninguna unidad, el atajo se esconde en vez de
   * ofrecer algo que fallaría al guardar.
   */
  const unidadesQuery = useUnidades({ per_page: 100 });
  const unidad = unidadPorDefecto(unidadesQuery.data?.data ?? []);
  /** El atajo solo existe en el alta: el backend no lo reabre en una edición. */
  const ofreceAtajo = !esEdicion && controlaInventario && unidad !== undefined;
  const creaInsumo = ofreceAtajo && saleDelAlmacen;

  /**
   * Un producto con inventario encendido pero **sin receta no descuenta nada** al
   * cobrar (`DescontarInventarioService`: recorre las recetas del producto y si no
   * hay, no asienta movimiento). Se consulta solo al editar uno así, para poder
   * decirlo en vez de dejar que el interruptor prometa algo que no ocurre.
   */
  const recetasQuery = useRecetas(
    { id_producto: producto?.id, per_page: 1 },
    { enabled: open && esEdicion && Boolean(controlaInventario) && puedeVerRecetas },
  );
  const sinReceta = recetasQuery.isSuccess && (recetasQuery.data?.meta?.total ?? 0) === 0;

  const opcionesCategoria = useMemo(() => {
    const porId = new Map<number, CategoriaRecurso>();
    for (const c of [...categorias, ...categoriasNuevas]) porId.set(c.id, c);
    return [...porId.values()];
  }, [categorias, categoriasNuevas]);

  const traeAvanzados = Boolean(
    producto?.descripcion ||
      producto?.sku ||
      producto?.costo_referencia != null ||
      producto?.controla_inventario,
  );
  const masOpciones = masOpcionesManual ?? traeAvanzados;

  // Rehidrata el formulario cada vez que se abre o cambia el producto objetivo.
  useEffect(() => {
    if (!open) return;
    form.reset({
      nombre: producto?.nombre ?? "",
      id_categoria: producto?.id_categoria ?? 0,
      precio_venta: producto ? Number(producto.precio_venta) : 0,
      descripcion: producto?.descripcion ?? "",
      costo_referencia:
        producto?.costo_referencia != null ? Number(producto.costo_referencia) : undefined,
      sku: producto?.sku ?? "",
      controla_inventario: producto?.controla_inventario ?? false,
      // En un alta se propone el atajo; al editar no aplica.
      sale_del_almacen: !producto,
    });
  }, [open, producto, form]);

  /** Al cerrar se olvida lo que solo valía para esta apertura del diálogo. */
  function cambiarApertura(abierto: boolean) {
    if (!abierto) {
      setMasOpcionesManual(null);
      setCreandoCategoria(false);
      setNombreCategoria("");
    }
    onOpenChange(abierto);
  }

  /** Crea la categoría sin salir del formulario y la deja seleccionada. */
  async function crearCategoria() {
    const nombre = nombreCategoria.trim();
    if (!nombre) return;
    // La posición no se pregunta: va al final, igual que en la pantalla de Categorías.
    const siguiente =
      opcionesCategoria.reduce((max, c) => Math.max(max, c.orden_display ?? 0), 0) + 1;
    try {
      const creada = await guardarCategoria.mutateAsync({ nombre, orden_display: siguiente });
      setCategoriasNuevas((previas) => [...previas, creada]);
      form.setValue("id_categoria", creada.id, { shouldValidate: true });
      setNombreCategoria("");
      setCreandoCategoria(false);
    } catch {
      // El mensaje del backend ya se mostró en un toast (regla #2); el campo se queda
      // con lo tecleado para corregir.
    }
  }

  function onSubmit(values: ProductoInput, crearOtro = false) {
    // `sale_del_almacen` es del formulario, no del API: lo que viaja es el objeto
    // `insumo`. Y el costo capturado va a un sitio o al otro, nunca a los dos: con
    // inventario encendido, `MargenQuery` lee el del insumo e ignora el del producto.
    const insumo =
      creaInsumo && unidad
        ? {
            id_unidad_medida: unidad.id,
            ...(values.costo_referencia != null
              ? { costo_unitario: values.costo_referencia }
              : {}),
          }
        : undefined;

    // El payload se arma campo por campo en vez de esparcir `values`: así se ve que
    // `sale_del_almacen` es del formulario y no del API, y dónde acaba el costo.
    guardar.mutate(
      {
        id: producto?.id,
        nombre: values.nombre,
        id_categoria: values.id_categoria,
        precio_venta: values.precio_venta,
        descripcion: values.descripcion,
        sku: values.sku,
        controla_inventario: values.controla_inventario,
        costo_referencia: insumo ? undefined : values.costo_referencia,
        insumo,
      },
      {
        onSuccess: () => {
          if (!crearOtro) {
            cambiarApertura(false);
            return;
          }
          // Se conserva lo que se repite al cargar un menú (categoría y modo de
          // inventario) y se limpia lo que cambia en cada renglón.
          form.reset({
            ...form.getValues(),
            nombre: "",
            precio_venta: 0,
            descripcion: "",
            costo_referencia: undefined,
            sku: "",
          });
          form.setFocus("nombre");
        },
        onError: (e: ApiError) => {
          if (e.errors) {
            const campos = [
              "nombre",
              "id_categoria",
              "precio_venta",
              "descripcion",
              "costo_referencia",
              "sku",
              "controla_inventario",
            ];
            for (const [campo, msgs] of Object.entries(e.errors)) {
              if (campos.includes(campo)) {
                form.setError(campo as keyof ProductoInput, { message: msgs[0] });
              }
            }
          }
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={cambiarApertura}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{esEdicion ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          <DialogDescription>
            {esEdicion
              ? "Actualiza los datos del producto."
              : "Crea un producto para venderlo en el POS."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => onSubmit(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input autoFocus placeholder="Ej. Corona 355ml" {...field} />
                  </FormControl>
                  {homonimo && (
                    // `status` y no `alert`: no interrumpe, informa mientras se teclea.
                    <p
                      role="status"
                      className="flex items-start gap-2 text-xs text-text-secondary"
                    >
                      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
                      <span>
                        Ya existe <strong className="font-medium">{homonimo.nombre}</strong>
                        {homonimo.categoria?.nombre ? " en " + homonimo.categoria.nombre : ""} a{" "}
                        {formatMoney(homonimo.precio_venta)}. Si es una variante, distínguela en
                        el nombre (ej. «{homonimo.nombre} — 1 litro»); si no, edita el que ya
                        existe en vez de crear otro.
                      </span>
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="id_categoria"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Categoría</FormLabel>
                    {puedeCrearCategorias && !creandoCategoria && (
                      // Que falte una categoría no debería obligar a salir del alta,
                      // perder lo tecleado y volver a empezar en otra pantalla.
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setCreandoCategoria(true)}
                      >
                        <Plus />
                        Nueva categoría
                      </Button>
                    )}
                  </div>
                  {creandoCategoria ? (
                    <div className="flex gap-2">
                      <Input
                        autoFocus
                        value={nombreCategoria}
                        onChange={(e) => setNombreCategoria(e.target.value)}
                        onKeyDown={(e) => {
                          // Enter aquí crearía la categoría y además enviaría el
                          // formulario del producto: se corta la propagación.
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void crearCategoria();
                          }
                          if (e.key === "Escape") setCreandoCategoria(false);
                        }}
                        placeholder="Nombre de la categoría"
                        aria-label="Nombre de la nueva categoría"
                      />
                      <Button
                        type="button"
                        onClick={() => void crearCategoria()}
                        disabled={guardarCategoria.isPending || nombreCategoria.trim() === ""}
                      >
                        {guardarCategoria.isPending ? "Creando…" : "Crear"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setCreandoCategoria(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una categoría" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {opcionesCategoria.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="precio_venta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio de venta</FormLabel>
                  <FormControl>
                    <InputNumerico
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

            <div className="rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setMasOpcionesManual(!masOpciones)}
                aria-expanded={masOpciones}
                aria-controls="producto-mas-opciones"
                className="flex w-full items-center gap-2 p-3 text-sm font-medium text-text-secondary hover:bg-surface-2"
              >
                {masOpciones ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
                Más opciones
                <span className="font-normal text-text-muted">
                  descripción, inventario, costo y SKU
                </span>
              </button>

              <div
                id="producto-mas-opciones"
                hidden={!masOpciones}
                className="space-y-4 border-t border-border p-3"
              >
                <FormField
                  control={form.control}
                  name="descripcion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Opcional"
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
                  name="controla_inventario"
                  render={({ field }) => (
                    <FormItem className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <FormLabel>Descuenta insumos al venderse</FormLabel>
                          <FormDescription>
                            Al cobrar se restan del inventario los insumos de su receta.
                            Actívalo para lo que preparas o sacas del almacén; déjalo
                            apagado si no llevas inventario de este producto.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </div>
                      {field.value && sinReceta && (
                        // Encendido y sin receta el descuento no ocurre, y hasta hoy no
                        // había forma de enterarse: se vendía y el inventario no se movía.
                        <p className="mt-3 flex gap-2 rounded-md bg-surface-2 p-2 text-sm text-text-secondary">
                          <TriangleAlert
                            aria-hidden="true"
                            className="mt-0.5 size-4 shrink-0 text-warning"
                          />
                          <span>
                            Está encendido pero <strong>todavía no descuenta nada</strong>:
                            este producto no tiene receta. Créala en Recetas indicando qué
                            insumos lleva.
                          </span>
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                {ofreceAtajo && (
                  <FormField
                    control={form.control}
                    name="sale_del_almacen"
                    render={({ field }) => (
                      <FormItem className="rounded-lg border border-border p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <FormLabel>Sale del almacén tal cual</FormLabel>
                            <FormDescription>
                              Una botella, una lata, algo que se vende sin preparar.
                              Déjalo apagado si lleva varios ingredientes.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </div>
                        {field.value ? (
                          // Se dice lo que va a pasar antes de que pase: crear cosas de
                          // lado sin avisar es peor que pedir un clic de más.
                          <p className="mt-3 rounded-md bg-surface-2 p-2 text-sm text-text-secondary">
                            Se creará también su insumo en el almacén (unidad:{" "}
                            {(unidad?.nombre ?? "").toLowerCase()}) y su receta 1:1. Si ya
                            tienes un insumo con ese nombre, se reutiliza y no se duplica
                            el stock.
                          </p>
                        ) : (
                          <p className="mt-3 rounded-md bg-surface-2 p-2 text-sm text-text-secondary">
                            Tendrás que crear su receta en Recetas: hasta entonces no
                            descontará nada al venderse.
                          </p>
                        )}
                      </FormItem>
                    )}
                  />
                )}

                {controlaInventario && !creaInsumo ? (
                  // El costo del producto sale de su receta (`MargenQuery`); pedir aquí
                  // un costo que el reporte va a ignorar solo confunde.
                  <p className="text-sm text-text-secondary">
                    El costo se calcula solo, sumando los insumos de su receta.
                  </p>
                ) : (
                  <FormField
                    control={form.control}
                    name="costo_referencia"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>¿Cuánto te cuesta cada uno?</FormLabel>
                        <FormControl>
                          <InputNumerico
                            decimales={2}
                            placeholder="Opcional, aproximado"
                            name={field.name}
                            ref={field.ref}
                            onBlur={field.onBlur}
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormDescription>
                          {creaInsumo
                            ? "Es lo que pagas por cada unidad al comprarla. Se guarda en el insumo, que es de donde el reporte de utilidad toma el costo."
                            : "Solo se usa para el reporte de utilidad. Si lo dejas vacío, ese reporte contará este producto como si no costara nada y mostrará 100% de margen. Un aproximado sirve."}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código o SKU</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Opcional"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Para lo que viene empaquetado o etiquetado. Lo preparado no suele
                        necesitarlo.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => cambiarApertura(false)}
                disabled={guardar.isPending}
              >
                Cancelar
              </Button>
              {!esEdicion && (
                // Cargar un menú es repetir el mismo gesto decenas de veces: guardar sin
                // cerrar, conservando la categoría, ahorra dos clics por producto.
                <Button
                  type="button"
                  variant="secondary"
                  disabled={guardar.isPending}
                  onClick={form.handleSubmit((v) => onSubmit(v, true))}
                >
                  Guardar y crear otro
                </Button>
              )}
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
