import { useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputNumerico } from "@/components/shared";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { useInsumos, type InsumoRecurso } from "@/features/insumos";
import { useRecetas, useReemplazarReceta } from "../api";
import type { InsumoDeReceta, RecetaRecurso } from "../types";

interface RecetaProductoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Producto cuya receta se edita. Es **obligatorio**: la receta no es una entidad que
   * se cree suelta, es una propiedad del producto, y se entra a ella desde su fila.
   */
  producto: { id: number; nombre: string };
}

/** Renglón en edición. Siempre tiene insumo: se crea al elegirlo de la lista. */
interface Renglon {
  clave: string;
  idInsumo: number;
  cantidad: number | undefined;
}

let contador = 0;
function nuevoRenglon(idInsumo: number, cantidad?: number): Renglon {
  contador += 1;
  return { clave: "renglon-" + contador, idInsumo, cantidad };
}

/**
 * Armador de la receta COMPLETA de un producto (M07).
 *
 * Sustituye al alta renglón por renglón: una receta real —un azulito lleva alcohol,
 * curazao y limón— eran cuatro modales, reeligiendo el producto cada vez, y cuatro
 * filas sueltas en la lista. Aquí el producto se elige **una vez** y los insumos se
 * agregan y quitan en la misma pantalla; se guarda todo junto con
 * `PUT /recetas/producto/{id}`, que el backend aplica en una transacción.
 *
 * **Cómo se busca (2026-09-09).** Antes había un campo de texto y, aparte, un `select`
 * cerrado: al teclear no pasaba nada visible y había que desplegar para ver el efecto.
 * Ahora las coincidencias se pintan **debajo del campo**, y en insumos el clic agrega
 * el renglón directamente — un gesto en vez de tres. Es el mismo patrón del
 * `ProductoPicker` del POS, para que la gente no aprenda dos formas de buscar.
 *
 * **El producto ya no se elige aquí (2026-09-11).** El diálogo traía su propio buscador de
 * productos para el botón "Nueva receta", que prometía crear algo cuando en realidad
 * preguntaba "¿de cuál?" y luego abría la receta que ya existía. La lista de la pantalla ya
 * muestra cada producto con su estado y su acción, así que se entra desde la fila: un
 * buscador menos y un título que no miente.
 *
 * Solo se ofrecen insumos **controlados**: los de consumo se echan al tanteo, no se
 * descuentan al vender, y el backend los rechaza aunque alguien los mande a mano.
 */
export function RecetaProductoDialog({
  open,
  onOpenChange,
  producto,
}: RecetaProductoDialogProps) {
  const idProducto = producto.id;
  const [textoInsumo, setTextoInsumo] = useState("");
  const [busquedaInsumo, setBusquedaInsumo] = useState("");
  /**
   * Insumos elegidos en esta sesión del diálogo. El catálogo se busca contra el
   * servidor, así que un insumo deja de venir en la respuesta en cuanto se escribe
   * otra cosa; sin recordarlo aquí, su renglón se quedaría sin nombre y el costo
   * estimado bajaría solo.
   */
  const [elegidos, setElegidos] = useState<Map<number, InsumoDeReceta>>(new Map());
  /**
   * Renglones tocados por el usuario. Mientras sea `null`, lo que se pinta se
   * **deriva** de la receta guardada: así no hace falta un efecto que copie la
   * respuesta del servidor al estado (y que pisaría lo ya editado si llega tarde).
   */
  const [edicion, setEdicion] = useState<Renglon[] | null>(null);
  /**
   * Renglón recién agregado: se le manda el cursor para teclear la cantidad. Va en un
   * ref y se resuelve en el `ref` del propio campo, no en un efecto: enfocar es un
   * efecto del DOM, no un cambio de estado que deba disparar otro render.
   */
  const porEnfocar = useRef<string | null>(null);

  /** Reset al abrir, ajustando el estado durante el render (patrón de React). */
  const [abiertoAntes, setAbiertoAntes] = useState(open);
  if (open !== abiertoAntes) {
    setAbiertoAntes(open);
    if (open) {
      setTextoInsumo("");
      setBusquedaInsumo("");
      setElegidos(new Map());
      setEdicion(null);
    }
  }

  useEffect(() => {
    const termino = textoInsumo.trim();
    const id = setTimeout(() => setBusquedaInsumo(termino), 300);
    return () => clearTimeout(id);
  }, [textoInsumo]);

  // Pedía `per_page: 100` sin buscador: un almacén más grande dejaba insumos
  // inalcanzables y en silencio, el mismo defecto que tenía el POS con 100 productos.
  const insumosQuery = useInsumos(
    {
      tipo: "controlado",
      per_page: 20,
      ...(busquedaInsumo === "" ? {} : { buscar: busquedaInsumo }),
    },
    { enabled: open },
  );
  // La receta que ya existe: es lo que hay que precargar para no volver a teclearla.
  const recetaQuery = useRecetas(
    { id_producto: idProducto, per_page: 100 },
    { enabled: open },
  );

  /** Lo que devolvió la búsqueda: es lo que se ofrece para agregar. */
  const insumos = useMemo(() => insumosQuery.data?.data ?? [], [insumosQuery.data]);
  const guardar = useReemplazarReceta();

  const renglonesGuardados = useMemo<RecetaRecurso[]>(
    () => recetaQuery.data?.data ?? [],
    [recetaQuery.data],
  );

  /** La receta guardada, ya en forma de renglones editables. */
  const derivados = useMemo<Renglon[]>(
    () => renglonesGuardados.map((r) => nuevoRenglon(r.id_insumo, Number(r.cantidad))),
    [renglonesGuardados],
  );
  const renglones = edicion ?? derivados;

  /**
   * Todo insumo que la pantalla necesita nombrar, por id: los que trajo la búsqueda,
   * los que ya estaban en la receta guardada y los agregados a mano. La búsqueda sola
   * no basta — el insumo de un renglón puede no estar en la respuesta actual.
   */
  const catalogo = useMemo(() => {
    const mapa = new Map<number, InsumoDeReceta>();
    for (const r of renglonesGuardados) if (r.insumo) mapa.set(r.insumo.id, r.insumo);
    for (const [id, i] of elegidos) mapa.set(id, i);
    for (const i of insumos) mapa.set(i.id, i);
    return mapa;
  }, [renglonesGuardados, elegidos, insumos]);

  /** Insumos ya usados: repetir uno choca con el par único del backend. */
  const usados = new Set(renglones.map((r) => r.idInsumo));

  function agregarInsumo(i: InsumoRecurso) {
    if (usados.has(i.id)) return;
    const renglon = nuevoRenglon(i.id);
    // Se recuerda al vuelo: la siguiente búsqueda ya no va a traerlo.
    setElegidos((prev) => new Map(prev).set(i.id, i));
    setEdicion((prev) => [...(prev ?? derivados), renglon]);
    // El campo se limpia para encadenar el siguiente insumo sin borrar a mano.
    setTextoInsumo("");
    setBusquedaInsumo("");
    porEnfocar.current = renglon.clave;
  }

  function actualizar(clave: string, cambios: Partial<Renglon>) {
    setEdicion((prev) =>
      (prev ?? derivados).map((r) => (r.clave === clave ? { ...r, ...cambios } : r)),
    );
  }

  function quitar(clave: string) {
    setEdicion((prev) => (prev ?? derivados).filter((r) => r.clave !== clave));
  }

  const completos = renglones.filter((r) => r.cantidad != null && r.cantidad > 0);
  const incompletos = renglones.some((r) => r.cantidad == null || r.cantidad <= 0);

  /**
   * Suma de lo que cuesta cada insumo por su cantidad. Es una **estimación** del
   * frontend, no dinero de una venta (regla #6): sirve para poner precio mientras se
   * arma la receta, y por eso se rotula como estimado.
   */
  const costo = completos.reduce((total, r) => {
    const insumo = catalogo.get(r.idInsumo);
    const unitario = insumo?.costo_unitario == null ? 0 : Number(insumo.costo_unitario);
    return total + unitario * (r.cantidad ?? 0);
  }, 0);
  const faltaCosto = completos.some((r) => catalogo.get(r.idInsumo)?.costo_unitario == null);
  /**
   * Ningún insumo tiene costo: la suma da cero, pero eso no es que la receta salga
   * gratis — es que no hay con qué calcularla. Se dice, no se pinta "$0.00".
   */
  const costoDesconocido = faltaCosto && costo === 0;

  const nombreProducto = producto.nombre;
  /** La primera coincidencia que todavía se puede agregar (la que toma Enter). */
  const primerInsumoLibre = insumos.find((i) => !usados.has(i.id));

  function onGuardar() {
    guardar.mutate(
      {
        idProducto,
        insumos: completos.map((r) => ({ id_insumo: r.idInsumo, cantidad: r.cantidad as number })),
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{"Receta de " + nombreProducto}</DialogTitle>
          <DialogDescription>
            Qué insumos consume este producto cada vez que se vende, y cuánto de cada uno.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="receta-insumo">Agregar insumo</Label>
              <Input
                id="receta-insumo"
                value={textoInsumo}
                onChange={(e) => setTextoInsumo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && primerInsumoLibre) {
                    e.preventDefault();
                    agregarInsumo(primerInsumoLibre);
                  }
                }}
                placeholder="Buscar insumo por nombre"
                aria-label="Buscar insumo"
              />

              <ListaResultados
                vacia={insumos.length === 0 && !insumosQuery.isLoading}
                cargando={insumosQuery.isLoading}
              >
                {insumos.map((i) => {
                  const yaEsta = usados.has(i.id);
                  return (
                    <Resultado
                      key={i.id}
                      disabled={yaEsta}
                      onClick={() => agregarInsumo(i)}
                      aria-label={"Agregar " + i.nombre}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        <span className="font-medium text-foreground">{i.nombre}</span>
                        {i.unidad_medida?.abreviacion ? (
                          <span className="text-sm text-text-muted">
                            {" (" + i.unidad_medida.abreviacion + ")"}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-sm tabular-nums text-text-secondary">
                        {yaEsta
                          ? "Ya está en la receta"
                          : i.costo_unitario == null
                            ? "Sin costo"
                            : formatMoney(i.costo_unitario)}
                      </span>
                    </Resultado>
                  );
                })}
              </ListaResultados>

              {/* Un espacio en blanco no dice cuál de los dos vacíos es. */}
              {insumos.length === 0 && !insumosQuery.isLoading && (
                <p className="text-sm text-text-muted">
                  {busquedaInsumo === ""
                    ? "No hay insumos controlados en el almacén todavía."
                    : `Ningún insumo controlado coincide con «${busquedaInsumo}». Los de consumo no aparecen aquí: se echan al tanteo y no se descuentan al vender.`}
                </p>
              )}
            </div>

            {/* Los renglones: el insumo ya no se elige aquí, solo su cantidad. */}
            {renglones.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-text-secondary">
                Aún no hay insumos. Busca uno arriba y haz clic para agregarlo.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="hidden gap-2 px-1 text-xs uppercase tracking-wide text-text-muted sm:grid sm:grid-cols-[1fr_120px_64px_40px]">
                  <span>Insumo</span>
                  <span>Cantidad</span>
                  <span />
                  <span />
                </div>

                {renglones.map((renglon) => {
                  const insumo = catalogo.get(renglon.idInsumo);
                  const nombre = insumo?.nombre ?? "Insumo " + renglon.idInsumo;
                  return (
                    <div
                      key={renglon.clave}
                      className="grid grid-cols-[1fr_100px_40px] items-center gap-2 sm:grid-cols-[1fr_120px_64px_40px]"
                    >
                      <span className="min-w-0 truncate text-foreground">{nombre}</span>

                      <InputNumerico
                        // El ref corre tras el commit, así que aquí sí se puede
                        // leer el ref: en render está prohibido y además mentiría.
                        ref={(el) => {
                          if (el && porEnfocar.current === renglon.clave) {
                            el.focus();
                            porEnfocar.current = null;
                          }
                        }}
                        decimales={3}
                        placeholder="0"
                        value={renglon.cantidad}
                        onChange={(v) => actualizar(renglon.clave, { cantidad: v ?? undefined })}
                        aria-label={"Cantidad de " + nombre}
                      />

                      <span className="hidden text-sm text-text-secondary sm:block">
                        {insumo?.unidad_medida?.abreviacion ?? ""}
                      </span>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => quitar(renglon.clave)}
                        aria-label={"Quitar " + nombre}
                      >
                        <X />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-border pt-3">
              <span className="text-xs uppercase tracking-wide text-text-muted">
                Costo estimado
              </span>
              <span className="font-display text-lg font-bold tabular-nums text-foreground">
                {costoDesconocido ? "—" : formatMoney(costo)}
              </span>
              <span className="text-sm text-text-secondary">
                {costoDesconocido
                  ? "Ningún insumo tiene costo capturado: no hay con qué calcularlo."
                  : faltaCosto
                    ? "Falta el costo de algún insumo, así que sale corto."
                    : "Suma del costo de los insumos por su cantidad."}
              </span>
            </div>

            {completos.length === 0 && (
              <p className="text-sm text-text-secondary">
                Sin insumos, guardar borra la receta y el producto dejará de descontar.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={guardar.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={onGuardar}
            disabled={guardar.isPending || incompletos}
          >
            {guardar.isPending
              ? "Guardando…"
              : incompletos
                ? "Falta la cantidad de un insumo"
                : "Guardar receta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Caja de coincidencias bajo un buscador. Existe para que teclear tenga efecto
 * **visible**: con un `select` cerrado el filtro ocurría donde nadie lo veía, y había
 * que desplegar para descubrir que había pasado algo.
 */
function ListaResultados({
  children,
  vacia,
  cargando,
}: {
  children: ReactNode;
  vacia: boolean;
  cargando?: boolean;
}) {
  if (cargando) {
    return (
      <div className="rounded-lg border border-border p-3 text-sm text-text-muted">
        Buscando…
      </div>
    );
  }
  if (vacia) return null;
  return (
    <div className="max-h-56 overflow-y-auto rounded-lg border border-border">{children}</div>
  );
}

/** Una coincidencia: toda la fila es el objetivo táctil, no un enlace diminuto. */
function Resultado({
  children,
  onClick,
  disabled,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex min-h-tap w-full items-center gap-2 border-b border-border px-3 py-2 text-left last:border-b-0",
        "hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent",
      )}
      {...props}
    >
      {children}
    </button>
  );
}
