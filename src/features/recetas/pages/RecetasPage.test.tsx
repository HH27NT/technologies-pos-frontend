import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { limpiarSesion, renderConProviders } from "@/test/utils";
import { RecetasPage } from "./RecetasPage";
import type { ProductoConReceta, RenglonDeReceta } from "../types";

/**
 * Recetas (M07), rehecha el 2026-09-10 como lista **de productos**.
 *
 * Lo que se protege es el defecto que se vio en el navegador: una receta de dos
 * insumos se pintaba como dos filas y la segunda salía con la columna "Producto"
 * vacía, como si fuera un producto huérfano. Y algo peor que no se veía: `/recetas`
 * pagina por renglón, así que una receta larga se partía entre páginas y el producto
 * de la siguiente parecía no tener ninguna — un "sin receta" falso manda a capturar
 * lo que ya existe.
 *
 * Además: el buscador y el filtro "sin receta" son **del servidor** (van en la
 * petición), y las cantidades se muestran sin los ceros de relleno del decimal(10,3).
 */

const { getMock, putMock } = vi.hoisted(() => ({ getMock: vi.fn(), putMock: vi.fn() }));

vi.mock("@/lib/api/client", () => ({
  client: { get: getMock, post: vi.fn(), put: putMock, patch: vi.fn(), delete: vi.fn() },
}));

function renglon(id: number, idProducto: number, nombre: string, cantidad: string): RenglonDeReceta {
  return {
    id,
    id_producto: idProducto,
    id_insumo: id + 100,
    cantidad,
    insumo: {
      id: id + 100,
      nombre,
      costo_unitario: "20.00",
      unidad_medida: { id: 3, nombre: "Pieza", abreviacion: "pza", es_global: true },
    },
  };
}

function producto(
  id: number,
  nombre: string,
  categoria: string,
  recetas: RenglonDeReceta[],
): ProductoConReceta {
  return {
    id,
    id_categoria: 1,
    nombre,
    descripcion: null,
    precio_venta: "60.00",
    costo_referencia: null,
    controla_inventario: true,
    disponible: true,
    sku: null,
    categoria: { id: 1, nombre: categoria, orden_display: 1, activo: true },
    recetas,
  };
}

/** El caso real de la captura: la michelada lleva dos insumos. */
const MICHELADA = producto(2, "Michelada con corona", "Bebidas preparadas", [
  renglon(1, 2, "Cerveza de 350ml", "1.000"),
  renglon(2, 2, "XX Lager", "2.500"),
]);
const CORONA = producto(1, "Corona 355ml", "Cervezas", [renglon(3, 1, "Cerveza de 350ml", "1.000")]);
const AGUA = producto(3, "Agua mineral", "Bebidas preparadas", []);

const CATALOGO = [CORONA, MICHELADA, AGUA];

function pagina(data: ProductoConReceta[], lastPage = 1) {
  return {
    data,
    meta: { current_page: 1, per_page: 15, total: data.length, last_page: lastPage },
    links: { first: null, last: null, prev: null, next: null },
  };
}

interface Peticion {
  params?: Record<string, unknown>;
}

const peticiones: Peticion["params"][] = [];

/** Responde `/productos` filtrando igual que el backend (buscar + sin_receta). */
function montar(catalogo: ProductoConReceta[] = CATALOGO, lastPage = 1) {
  getMock.mockImplementation((url: string, config?: Peticion) => {
    if (url !== "/productos") return Promise.resolve(pagina([]));
    const params = config?.params ?? {};
    peticiones.push(params);
    const termino = String(params.buscar ?? "").toLowerCase();
    let lista = catalogo;
    if (params.sin_receta) lista = lista.filter((p) => p.recetas.length === 0);
    if (termino !== "") lista = lista.filter((p) => p.nombre.toLowerCase().includes(termino));
    return Promise.resolve(pagina(lista, lastPage));
  });

  renderConProviders(
    <MemoryRouter>
      <RecetasPage />
    </MemoryRouter>,
    { permisos: ["recetas.gestionar"] },
  );
  return userEvent.setup();
}

/**
 * El DataTable pinta dos vistas —tarjetas en teléfono y tabla en escritorio— y las
 * dos viven en el DOM a la vez, así que todo se busca dentro de la tabla.
 */
const tabla = () => screen.getByRole("table");
const filtro = () => screen.getByRole("group", { name: /filtrar recetas/i });
const pildora = (nombre: RegExp) => within(filtro()).getByRole("button", { name: nombre });

/** La fila del producto, que es la unidad de esta pantalla. */
const fila = (nombre: RegExp) =>
  waitFor(() => within(tabla()).getByRole("row", { name: nombre }));

/** La petición de la lista (no la del contador de faltantes, que pide `per_page`). */
function ultimaBusqueda() {
  return [...peticiones].reverse().find((p) => p?.per_page === undefined);
}

afterEach(() => {
  getMock.mockReset();
  putMock.mockReset();
  peticiones.length = 0;
  limpiarSesion();
});

describe("RecetasPage · la receta se lee como una sola cosa", () => {
  it("pinta los dos insumos de la michelada dentro de su propia fila", async () => {
    montar();

    const michelada = await fila(/michelada con corona/i);

    // Los dos insumos viven en la fila del producto: ninguno queda huérfano.
    expect(within(michelada).getByText("Cerveza de 350ml")).toBeInTheDocument();
    expect(within(michelada).getByText("XX Lager")).toBeInTheDocument();
    // Y hay una fila por producto, no una por renglón.
    expect(within(tabla()).getAllByRole("row")).toHaveLength(CATALOGO.length + 1); // + encabezado
  });

  it("muestra la cantidad sin los ceros de relleno del decimal", async () => {
    montar();

    const michelada = await fila(/michelada con corona/i);

    // "1.000" y "2.500" llegan del backend; nadie capturó esa precisión.
    expect(within(michelada).getByText("1 pza")).toBeInTheDocument();
    expect(within(michelada).getByText("2.5 pza")).toBeInTheDocument();
    expect(within(michelada).queryByText("1.000")).not.toBeInTheDocument();
  });

  it("marca el producto que todavía no tiene receta y ofrece armarla", async () => {
    montar();

    const agua = await fila(/agua mineral/i);

    expect(within(agua).getByText("Sin receta")).toBeInTheDocument();
    expect(within(agua).getByRole("button", { name: /armar receta/i })).toBeInTheDocument();
  });

  it("pide solo los productos que descuentan inventario, con su receta", async () => {
    montar();

    await fila(/corona 355ml/i);

    // Una receta sobre un producto que no descuenta no hace nada al venderse.
    expect(ultimaBusqueda()).toMatchObject({ controla_inventario: 1, con_recetas: 1 });
  });
});

describe("RecetasPage · buscar y lo que falta", () => {
  it("busca contra el servidor, no dentro de la página", async () => {
    const user = montar();
    await fila(/corona 355ml/i);

    await user.type(screen.getByLabelText(/buscar productos/i), "michelada");

    await waitFor(() => expect(ultimaBusqueda()).toMatchObject({ buscar: "michelada" }));
    await waitFor(() =>
      expect(within(tabla()).queryByRole("row", { name: /corona 355ml/i })).toBeNull(),
    );
  });

  it("la píldora de lo que falta lleva el conteo de TODO el catálogo", async () => {
    montar();

    // Una sola fila pedida y el total leído del meta: el aviso no puede costar
    // traerse el catálogo entero.
    await waitFor(() => expect(pildora(/sin receta \(1\)/i)).toBeInTheDocument());
  });

  it("el filtro de lo que falta viaja al backend y deja solo esos productos", async () => {
    const user = montar();
    await fila(/corona 355ml/i);

    await user.click(pildora(/sin receta/i));

    await waitFor(() => expect(ultimaBusqueda()).toMatchObject({ sin_receta: 1 }));
    expect(await fila(/agua mineral/i)).toBeInTheDocument();
    expect(within(tabla()).queryByRole("row", { name: /michelada/i })).toBeNull();
  });

  it("cuando no falta ninguna lo dice como la buena noticia que es", async () => {
    const user = montar([CORONA, MICHELADA]);
    await fila(/corona 355ml/i);

    await user.click(pildora(/sin receta/i));

    expect(await screen.findByText(/todos tienen receta/i)).toBeInTheDocument();
  });
});

describe("RecetasPage · quitar la receta", () => {
  it("manda la receta vacía y dice cuántos insumos deja de descontar", async () => {
    putMock.mockResolvedValue([]);
    const user = montar();
    await fila(/michelada con corona/i);

    await user.click(within(tabla()).getByRole("button", { name: /acciones de michelada con corona/i }));
    await user.click(await screen.findByRole("menuitem", { name: /quitar receta/i }));

    // El copy no puede mentir: quitar la receta no borra el producto ni los insumos.
    expect(await screen.findByText(/dejará de descontar sus 2 insumos/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^quitar receta$/i }));

    await waitFor(() =>
      expect(putMock).toHaveBeenCalledWith("/recetas/producto/2", { insumos: [] }),
    );
  });

  it("al producto sin receta no le ofrece quitarla", async () => {
    const user = montar();
    await fila(/agua mineral/i);

    await user.click(within(tabla()).getByRole("button", { name: /acciones de agua mineral/i }));

    expect(await screen.findByRole("menuitem", { name: /armar receta/i })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /quitar receta/i })).not.toBeInTheDocument();
  });
});

describe("RecetasPage · permisos", () => {
  it("sin permiso de gestionar no se ofrece tocar nada", async () => {
    getMock.mockResolvedValue(pagina(CATALOGO));
    renderConProviders(
      <MemoryRouter>
        <RecetasPage />
      </MemoryRouter>,
      { permisos: [] },
    );

    await fila(/michelada con corona/i);

    expect(screen.queryByRole("button", { name: /nueva receta/i })).toBeNull();
    expect(within(tabla()).queryByRole("button", { name: /armar receta/i })).toBeNull();
    expect(within(tabla()).queryByRole("button", { name: /acciones de/i })).toBeNull();
  });
});
