import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ClipboardPaste, Plus, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, InputNumerico, PermissionGate } from "@/components/shared";
import { normalizarTexto } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ApiError } from "@/lib/api/types";
import { useCategorias, type CategoriaRecurso } from "@/features/categorias";
import { useUnidades, unidadPorDefecto } from "@/features/unidades";
import {
  erroresPorFila,
  useCrearProductosLote,
  useNombresDeProductos,
  MAXIMO_POR_LOTE,
  type FilaLote,
} from "../api";
import { parsearMenuPegado } from "../parsearMenu";

/**
 * Rejilla "Cargar menú" (M06, Fase B). Existe porque dar de alta un menú con el
 * modal de producto son ochenta modales: 80 × ~40 s ≈ una hora. Aquí un producto es
 * una línea, y un menú entero cabe en un pegado.
 *
 * **Por qué es una página y no un modal.** Un modal es para lo que interrumpe; esto
 * es la tarea. Además necesita el ancho de la pantalla y sobrevivir a que la persona
 * se distraiga: un clic fuera no puede tirar veinte líneas escritas.
 *
 * **Nada se guarda sin revisión.** El pegado llena la rejilla, se marcan repetidos y
 * huecos, y hasta que no se pulsa "Guardar" no viaja nada. El backend crea el lote en
 * una sola transacción: o entran todos o no entra ninguno, así que reintentar después
 * de corregir nunca duplica lo ya creado.
 */

/** Una fila de la rejilla. `key` es estable para que React no pierda el foco al reordenar. */
interface FilaRejilla {
  key: string;
  nombre: string;
  precio: number | undefined;
  /** Costo de compra; solo se captura y se envía con el atajo del almacén encendido. */
  costo: number | undefined;
  /**
   * `null` = sigue la categoría del bloque. Guardar la herencia en vez de copiar el
   * id hace que cambiar el selector de arriba arrastre a todas las filas que nadie
   * tocó, y respete las que sí. Copiar obligaría a repasar fila por fila.
   */
  idCategoria: number | null;
}

let contadorFilas = 0;
function nuevaFila(): FilaRejilla {
  contadorFilas += 1;
  return {
    key: "fila-" + contadorFilas,
    nombre: "",
    precio: undefined,
    costo: undefined,
    idCategoria: null,
  };
}

/** ¿La fila está vacía del todo? Las de relleno del final no son un error. */
function estaVacia(f: FilaRejilla): boolean {
  return f.nombre.trim() === "" && f.precio === undefined;
}

export function CargarMenuPage() {
  const navigate = useNavigate();
  const categoriasQuery = useCategorias({ per_page: 100 });
  const categorias = useMemo<CategoriaRecurso[]>(
    () => categoriasQuery.data?.data ?? [],
    [categoriasQuery.data],
  );

  const [categoriaBloque, setCategoriaBloque] = useState<number | null>(null);
  /**
   * Atajo del bloque: en una cantina, una sección entera del menú (cervezas, latas)
   * sale del almacén tal cual. Se decide una vez para todo el pegado en vez de fila
   * por fila, que sería ochenta decisiones idénticas.
   */
  const [saleDelAlmacen, setSaleDelAlmacen] = useState(false);
  const [filas, setFilas] = useState<FilaRejilla[]>(() => [nuevaFila()]);
  /** Errores del backend por índice de fila; se limpian al tocar la rejilla. */
  const [erroresServidor, setErroresServidor] = useState<Map<number, string>>(new Map());
  /** Se enciende al intentar guardar: hasta entonces no se regaña por campos a medias. */
  const [intentoGuardar, setIntentoGuardar] = useState(false);
  const [sobrantes, setSobrantes] = useState(0);

  /**
   * La primera categoría sirve de punto de partida: al cargar un menú se empieza por
   * una sección, y arrancar con el selector vacío obliga a un clic antes de escribir
   * nada. Queda a la vista en cada fila, así que no decide a espaldas de nadie.
   */
  const categoriaActiva = categoriaBloque ?? categorias[0]?.id ?? null;
  /** Categoría con la que se guardará la fila: la suya propia o la del bloque. */
  const categoriaDe = (f: FilaRejilla) => f.idCategoria ?? categoriaActiva;

  /** El insumo que crea el atajo necesita unidad; sin ninguna, el atajo no se ofrece. */
  const unidadesQuery = useUnidades({ per_page: 100 });
  const unidad = unidadPorDefecto(unidadesQuery.data?.data ?? []);
  const creaInsumos = saleDelAlmacen && unidad !== undefined;

  const crearLote = useCrearProductosLote();
  const nombresQuery = useNombresDeProductos();

  /** Refs de los campos de nombre, para que Enter salte a la fila siguiente. */
  const refsNombre = useRef(new Map<string, HTMLInputElement | null>());
  /**
   * Fila recién creada que debe recibir el foco. No se puede enfocar en el mismo
   * gesto que la crea —todavía no existe en el DOM— y `requestAnimationFrame` no
   * basta: React 19 puede tardar más de un fotograma en montarla y el foco se queda
   * en la fila anterior (visto en el navegador el 2026-09-04). El callback de `ref`
   * corre justo cuando el campo existe, que es el único momento seguro.
   */
  const porEnfocar = useRef<string | null>(null);

  const filasConDatos = useMemo(() => filas.filter((f) => !estaVacia(f)), [filas]);

  /** Nombres que ya existen en el catálogo (para el aviso de repetido). */
  const yaEnCatalogo = useMemo(
    () => new Set((nombresQuery.data ?? []).map((n) => normalizarTexto(n))),
    [nombresQuery.data],
  );

  /**
   * Repetidos dentro del propio pegado. Se marca a partir de la segunda aparición:
   * la primera es el producto y las siguientes son las que hay que revisar.
   */
  const repetidosEnRejilla = useMemo(() => {
    const vistos = new Set<string>();
    const repetidos = new Set<string>();
    for (const f of filas) {
      const k = normalizarTexto(f.nombre);
      if (k === "") continue;
      if (vistos.has(k)) repetidos.add(f.key);
      else vistos.add(k);
    }
    return repetidos;
  }, [filas]);

  function actualizar(key: string, cambio: Partial<FilaRejilla>) {
    setErroresServidor(new Map());
    setFilas((previas) => previas.map((f) => (f.key === key ? { ...f, ...cambio } : f)));
  }

  function agregarFila(despuesDe?: string) {
    const fila = nuevaFila();
    porEnfocar.current = fila.key;
    setFilas((previas) => {
      if (!despuesDe) return [...previas, fila];
      const i = previas.findIndex((f) => f.key === despuesDe);
      return [...previas.slice(0, i + 1), fila, ...previas.slice(i + 1)];
    });
  }

  function quitarFila(key: string) {
    setErroresServidor(new Map());
    setFilas((previas) => {
      const quedan = previas.filter((f) => f.key !== key);
      // La rejilla nunca se queda sin ninguna fila: no habría dónde escribir.
      return quedan.length > 0 ? quedan : [nuevaFila()];
    });
  }

  /**
   * Enter avanza en vez de enviar: cargar un menú es repetir la misma línea decenas
   * de veces, y levantar la mano al ratón en cada una es lo que hace lenta un alta.
   */
  function alTeclearEnFila(e: React.KeyboardEvent, indice: number) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const siguiente = filas[indice + 1];
    if (siguiente) refsNombre.current.get(siguiente.key)?.focus();
    else agregarFila();
  }

  /**
   * Pegar desde Excel, Sheets o una nota de WhatsApp. Se intercepta solo cuando el
   * contenido trae varias líneas o tabuladores: pegar un nombre suelto en una celda
   * tiene que seguir funcionando como en cualquier campo.
   */
  function alPegar(e: React.ClipboardEvent) {
    const texto = e.clipboardData.getData("text/plain");
    if (!texto.includes("\n") && !texto.includes("\t")) return;

    e.preventDefault();
    const { filas: leidas, columnasIgnoradas } = parsearMenuPegado(texto);
    if (leidas.length === 0) {
      toast.error("No se reconoció ningún producto en lo que pegaste.");
      return;
    }

    /** El encabezado de sección del pegado se casa con una categoría existente por nombre. */
    const porNombre = new Map(categorias.map((c) => [normalizarTexto(c.nombre), c.id]));
    const nuevas = leidas.map((l) => {
      const fila = nuevaFila();
      const porEncabezado = l.categoria ? porNombre.get(normalizarTexto(l.categoria)) : undefined;
      return {
        ...fila,
        nombre: l.nombre,
        precio: l.precio ?? undefined,
        idCategoria: porEncabezado ?? null,
      };
    });

    // Se conserva lo ya escrito y se anexa lo pegado, hasta el tope del backend.
    const previas = filas.filter((f) => !estaVacia(f));
    const cabe = Math.max(0, MAXIMO_POR_LOTE - previas.length);
    const aceptadas = nuevas.slice(0, cabe);
    setSobrantes(nuevas.length - aceptadas.length);
    setErroresServidor(new Map());
    setFilas([...previas, ...aceptadas, nuevaFila()]);

    if (columnasIgnoradas > 0) {
      toast.info(
        "Se usaron las dos primeras columnas (producto y precio); el resto se ignoró.",
      );
    }
  }

  /**
   * Cambiar la categoría del bloque arrastra a todas las filas, incluidas las que ya
   * tenían una elegida a mano: es el gesto de "todo esto es de esta sección", y dejar
   * excepciones invisibles sería peor que rehacer las dos que se quieran distintas.
   */
  function aplicarCategoriaATodas(id: number) {
    setCategoriaBloque(id);
    setFilas((previas) => previas.map((f) => ({ ...f, idCategoria: null })));
  }

  /** Qué le falta a una fila para poder guardarse. `null` = está lista. */
  function faltaEn(f: FilaRejilla): string | null {
    if (f.nombre.trim() === "") return "Falta el nombre.";
    if (f.precio === undefined) return "Falta el precio.";
    if (categoriaDe(f) === null) return "Falta la categoría.";
    return null;
  }

  const incompletas = filasConDatos.filter((f) => faltaEn(f) !== null).length;
  const repetidas = filasConDatos.filter(
    (f) => repetidosEnRejilla.has(f.key) || yaEnCatalogo.has(normalizarTexto(f.nombre)),
  ).length;

  function guardar() {
    setIntentoGuardar(true);
    if (filasConDatos.length === 0) {
      toast.error("Escribe o pega al menos un producto.");
      return;
    }
    if (incompletas > 0) {
      toast.error(
        incompletas === 1
          ? "Hay una fila incompleta; está marcada abajo."
          : "Hay " + incompletas + " filas incompletas; están marcadas abajo.",
      );
      return;
    }

    const lote: FilaLote[] = filasConDatos.map((f) => ({
      nombre: f.nombre.trim(),
      id_categoria: categoriaDe(f) as number,
      precio_venta: f.precio as number,
      // El costo viaja dentro del insumo porque es de ahí de donde el reporte de
      // margen lo lee cuando el producto descuenta inventario.
      ...(creaInsumos && unidad
        ? {
            insumo: {
              id_unidad_medida: unidad.id,
              ...(f.costo != null ? { costo_unitario: f.costo } : {}),
            },
          }
        : {}),
    }));

    crearLote.mutate(lote, {
      onSuccess: (creados) => {
        toast.success(
          creados.length === 1
            ? "Se creó 1 producto."
            : "Se crearon " + creados.length + " productos.",
        );
        // La rejilla queda limpia para el siguiente bloque, conservando la categoría:
        // un menú largo se carga por secciones, no de una sentada.
        setFilas([nuevaFila()]);
        setIntentoGuardar(false);
        setSobrantes(0);
      },
      onError: (e: ApiError) => setErroresServidor(erroresPorFila(e)),
    });
  }

  const sinCategorias = !categoriasQuery.isLoading && categorias.length === 0;

  return (
    <PermissionGate permiso="productos.gestionar">
      <PageHeader
        title="Cargar menú"
        description="Escribe o pega tu menú completo y guárdalo de una vez."
        actions={
          <Button variant="outline" asChild>
            <Link to="/app/productos">
              <ArrowLeft />
              Volver a productos
            </Link>
          </Button>
        }
      />

      {sinCategorias ? (
        // Sin categorías no hay dónde poner los productos: mandar a crearlas es más
        // honesto que dejar la rejilla escribible y fallar al guardar.
        <div className="rounded-lg border border-border bg-surface-1 p-6 text-center">
          <p className="font-medium text-foreground">Primero crea una categoría</p>
          <p className="mt-1 text-sm text-text-secondary">
            Todo producto vive en una categoría (cervezas, destilados, alimentos).
          </p>
          <Button className="mt-4" onClick={() => navigate("/app/categorias")}>
            Ir a categorías
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="sm:w-64">
              <label
                htmlFor="categoria-bloque"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Categoría de estas filas
              </label>
              <Select
                value={categoriaActiva ? String(categoriaActiva) : ""}
                onValueChange={(v) => aplicarCategoriaATodas(Number(v))}
              >
                <SelectTrigger id="categoria-bloque">
                  <SelectValue placeholder="Elige una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-text-secondary sm:pb-2">
              Se aplica a todas las filas. Puedes cambiarla en cualquier fila suelta.
            </p>
          </div>

          {unidad && (
            <div className="mb-4 rounded-lg border border-border bg-surface-1 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <label
                    htmlFor="sale-del-almacen"
                    className="text-sm font-medium text-foreground"
                  >
                    Estos productos salen del almacén tal cual
                  </label>
                  <p className="text-sm text-text-secondary">
                    Botellas y latas que se venden sin preparar. Enciéndelo y cada
                    producto creará también su insumo en el almacén (unidad:{" "}
                    {unidad.nombre.toLowerCase()}) y su receta 1:1, así el inventario se
                    descuenta al cobrar sin pasar por otras dos pantallas.
                  </p>
                </div>
                <Switch
                  id="sale-del-almacen"
                  checked={saleDelAlmacen}
                  onCheckedChange={setSaleDelAlmacen}
                />
              </div>
            </div>
          )}

          <div onPaste={alPegar} className="rounded-lg border border-border bg-surface-1">
            <div className="flex items-center gap-2 border-b border-border p-3 text-sm text-text-secondary">
              <ClipboardPaste aria-hidden="true" className="size-4 shrink-0" />
              <span>
                Pega aquí tu menú (Ctrl+V): sirve tal cual desde Excel, o una lista como{" "}
                <span className="font-medium text-foreground">Corona 45</span>. Enter pasa
                a la siguiente línea.
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-text-secondary">
                    <th scope="col" className="w-10 p-2 text-right font-medium">
                      #
                    </th>
                    <th scope="col" className="p-2 font-medium">
                      Producto
                    </th>
                    <th scope="col" className="w-32 p-2 font-medium">
                      Precio
                    </th>
                    {creaInsumos && (
                      // Solo cuando hay dónde guardar el costo: sin el atajo, este
                      // número no tendría destino y sobraría en la rejilla.
                      <th scope="col" className="w-32 p-2 font-medium">
                        Costo
                      </th>
                    )}
                    <th scope="col" className="w-56 p-2 font-medium">
                      Categoría
                    </th>
                    <th scope="col" className="w-10 p-2">
                      <span className="sr-only">Quitar</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((fila, indice) => {
                    const repetido =
                      normalizarTexto(fila.nombre) !== "" &&
                      (repetidosEnRejilla.has(fila.key) ||
                        yaEnCatalogo.has(normalizarTexto(fila.nombre)));
                    const falta = estaVacia(fila) ? null : faltaEn(fila);
                    const errorServidor = erroresServidor.get(
                      filasConDatos.findIndex((f) => f.key === fila.key),
                    );
                    const problema = errorServidor ?? (intentoGuardar ? falta : null);

                    return (
                      <tr key={fila.key} className="border-b border-border last:border-0">
                        <td className="p-2 text-right align-top tabular-nums text-text-muted">
                          <span className="inline-block pt-2">{indice + 1}</span>
                        </td>
                        <td className="p-2">
                          <Input
                            value={fila.nombre}
                            onChange={(e) => actualizar(fila.key, { nombre: e.target.value })}
                            onKeyDown={(e) => alTeclearEnFila(e, indice)}
                            ref={(el) => {
                              refsNombre.current.set(fila.key, el);
                              if (el && porEnfocar.current === fila.key) {
                                porEnfocar.current = null;
                                el.focus();
                              }
                            }}
                            placeholder={indice === 0 ? "Ej. Corona 355ml" : ""}
                            aria-label={"Nombre del producto " + (indice + 1)}
                            aria-invalid={problema != null}
                          />
                          {repetido && (
                            // Se avisa y se deja pasar: el mismo nombre en dos categorías
                            // con precios distintos es legítimo, y quien carga el menú es
                            // quien sabe si sobra.
                            <Badge variant="warning" className="mt-1">
                              <TriangleAlert aria-hidden="true" className="size-3" />
                              Ya existe con ese nombre
                            </Badge>
                          )}
                          {problema && (
                            <p className="mt-1 text-xs text-danger" role="alert">
                              {problema}
                            </p>
                          )}
                        </td>
                        <td className="p-2 align-top">
                          <InputNumerico
                            decimales={2}
                            value={fila.precio}
                            onChange={(v) => actualizar(fila.key, { precio: v ?? undefined })}
                            onKeyDown={(e) => alTeclearEnFila(e, indice)}
                            placeholder="0.00"
                            aria-label={"Precio del producto " + (indice + 1)}
                          />
                        </td>
                        {creaInsumos && (
                          <td className="p-2 align-top">
                            <InputNumerico
                              decimales={2}
                              value={fila.costo}
                              onChange={(v) => actualizar(fila.key, { costo: v ?? undefined })}
                              onKeyDown={(e) => alTeclearEnFila(e, indice)}
                              placeholder="Opcional"
                              aria-label={"Costo del producto " + (indice + 1)}
                            />
                          </td>
                        )}
                        <td className="p-2 align-top">
                          <Select
                            value={categoriaDe(fila) ? String(categoriaDe(fila)) : ""}
                            onValueChange={(v) => actualizar(fila.key, { idCategoria: Number(v) })}
                          >
                            <SelectTrigger aria-label={"Categoría del producto " + (indice + 1)}>
                              <SelectValue placeholder="Sin categoría" />
                            </SelectTrigger>
                            <SelectContent>
                              {categorias.map((c) => (
                                <SelectItem key={c.id} value={String(c.id)}>
                                  {c.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2 align-top">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => quitarFila(fila.key)}
                            aria-label={"Quitar la fila " + (indice + 1)}
                          >
                            <X />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="border-t border-border p-2">
              <Button variant="ghost" size="sm" onClick={() => agregarFila()}>
                <Plus />
                Agregar fila
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 text-sm" aria-live="polite">
              <p className="text-text-secondary">
                {filasConDatos.length === 1
                  ? "1 producto por crear"
                  : filasConDatos.length + " productos por crear"}
                {filasConDatos.length >= MAXIMO_POR_LOTE &&
                  " · máximo " + MAXIMO_POR_LOTE + " por vez"}
              </p>
              {repetidas > 0 && (
                <p className="text-warning">
                  {repetidas === 1
                    ? "1 nombre ya existe; revísalo antes de guardar."
                    : repetidas + " nombres ya existen; revísalos antes de guardar."}
                </p>
              )}
              {sobrantes > 0 && (
                <p className="text-text-secondary">
                  Quedaron {sobrantes} fuera por el tope de {MAXIMO_POR_LOTE}. Guarda estos
                  y pega el resto.
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/app/productos")}>
                Cancelar
              </Button>
              <Button onClick={guardar} disabled={crearLote.isPending}>
                {crearLote.isPending ? "Guardando…" : "Guardar productos"}
              </Button>
            </div>
          </div>
        </>
      )}
    </PermissionGate>
  );
}
