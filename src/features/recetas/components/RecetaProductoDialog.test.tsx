import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { limpiarSesion, renderConProviders } from "@/test/utils";
import { RecetaProductoDialog } from "./RecetaProductoDialog";
import type { RecetaRecurso } from "../types";
import type { ProductoRecurso } from "@/features/productos";
import type { InsumoRecurso } from "@/features/insumos";

/**
 * Armador de la receta completa de un producto (M07, 2026-09-07). Sustituye al alta
 * renglón por renglón, que obligaba a abrir el modal —y reelegir el producto— una vez
 * por ingrediente: un azulito lleva alcohol, curazao y limón.
 *
 * Protege tres cosas que costaron caro:
 * 1. los filtros (solo productos que descuentan inventario, solo insumos controlados);
 * 2. la búsqueda **contra el servidor**, porque una sola página dejaba insumos
 *    inalcanzables y en silencio en un almacén grande;
 * 3. que teclear tenga **efecto visible** (2026-09-09): antes el filtro ocurría dentro
 *    de un `select` cerrado y había que desplegarlo para descubrir que pasó algo.
 */

const { getMock, putMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  putMock: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  client: { get: getMock, post: vi.fn(), put: putMock, patch: vi.fn(), delete: vi.fn() },
}));

function producto(id: number, nombre: string, categoria: string): ProductoRecurso {
  return {
    id,
    id_categoria: 1,
    nombre,
    descripcion: null,
    precio_venta: "90.00",
    costo_referencia: null,
    controla_inventario: true,
    disponible: true,
    sku: null,
    categoria: { id: 1, nombre: categoria, orden_display: 1, activo: true },
  };
}

function insumo(id: number, nombre: string, costo: string | null): InsumoRecurso {
  return {
    id,
    nombre,
    tipo: "controlado",
    id_unidad_medida: 3,
    id_proveedor: null,
    stock_actual: "10.000",
    stock_minimo: "0.000",
    costo_unitario: costo,
    activo: true,
    stock_bajo: false,
    unidad_medida: { id: 3, nombre: "Mililitro", abreviacion: "ml", es_global: true },
    proveedor: null,
  };
}

const INSUMOS = [
  insumo(4, "Alcohol de caña", "0.09"),
  insumo(5, "Curazao azul", "0.22"),
  insumo(6, "Jugo de limón", null),
];

/** Receta ya guardada del azulito: dos renglones. */
const GUARDADA: RecetaRecurso[] = [
  {
    id: 1,
    id_producto: 7,
    id_insumo: 4,
    cantidad: "60.000",
    producto: { id: 7, nombre: "Azulito" },
    insumo: { id: 4, nombre: "Alcohol de caña" },
  },
  {
    id: 2,
    id_producto: 7,
    id_insumo: 5,
    cantidad: "30.000",
    producto: { id: 7, nombre: "Azulito" },
    insumo: { id: 5, nombre: "Curazao azul" },
  },
];

function coleccion<T>(data: T[]) {
  return {
    data,
    meta: { current_page: 1, per_page: 100, total: data.length, last_page: 1 },
    links: { first: null, last: null, prev: null, next: null },
  };
}

function montar(
  opciones: {
    producto?: { id: number; nombre: string };
    guardada?: RecetaRecurso[];
    productos?: ProductoRecurso[];
  } = {},
) {
  const productos = opciones.productos ?? [producto(7, "Azulito", "Preparados")];
  // Desde el 2026-09-11 el diálogo **siempre** abre sobre un producto: se entra desde
  // su fila en la lista, no desde un botón que preguntaba "¿de cuál?".
  const elProducto = opciones.producto ?? AZULITO;
  getMock.mockImplementation((url: string, config?: { params?: Record<string, unknown> }) => {
    const termino = String(config?.params?.buscar ?? "").toLowerCase();
    const filtra = <T extends { nombre: string }>(lista: T[]) =>
      termino === "" ? lista : lista.filter((x) => x.nombre.toLowerCase().includes(termino));

    if (url === "/productos") return Promise.resolve(coleccion(filtra(productos)));
    // El backend filtra por nombre (`LOWER(nombre) LIKE`); el mock hace lo mismo para
    // que un insumo pueda quedar FUERA de los resultados, que es el caso que importa.
    if (url === "/insumos") return Promise.resolve(coleccion(filtra(INSUMOS)));
    return Promise.resolve(coleccion(opciones.guardada ?? []));
  });
  const onOpenChange = vi.fn();
  renderConProviders(
    <RecetaProductoDialog open onOpenChange={onOpenChange} producto={elProducto} />,
    { permisos: ["recetas.gestionar"] },
  );
  return { user: userEvent.setup(), onOpenChange };
}

/**
 * Agregar un insumo es **un** gesto: clic en la coincidencia. El catálogo llega por
 * red, así que primero se espera a que la fila exista.
 */
async function agregar(user: ReturnType<typeof userEvent.setup>, nombre: RegExp) {
  await user.click(await screen.findByRole("button", { name: nombre }));
}

function cantidadDe(nombre: RegExp) {
  return screen.getByLabelText(nombre);
}

const AZULITO = { id: 7, nombre: "Azulito" };

afterEach(() => {
  getMock.mockReset();
  putMock.mockReset();
  limpiarSesion();
});

describe("RecetaProductoDialog · varios insumos", () => {
  it("guarda una receta de tres insumos en una sola petición", async () => {
    putMock.mockResolvedValue([]);
    const { user } = montar({ producto: AZULITO });

    await agregar(user, /agregar alcohol de caña/i);
    await user.type(cantidadDe(/cantidad de alcohol de caña/i), "60");

    await agregar(user, /agregar curazao azul/i);
    await user.type(cantidadDe(/cantidad de curazao azul/i), "30");

    await agregar(user, /agregar jugo de limón/i);
    await user.type(cantidadDe(/cantidad de jugo de limón/i), "20");

    await user.click(screen.getByRole("button", { name: /guardar receta/i }));

    await waitFor(() =>
      expect(putMock).toHaveBeenCalledWith("/recetas/producto/7", {
        insumos: [
          { id_insumo: 4, cantidad: 60 },
          { id_insumo: 5, cantidad: 30 },
          { id_insumo: 6, cantidad: 20 },
        ],
      }),
    );
    expect(putMock).toHaveBeenCalledTimes(1);
  });

  it("precarga la receta que ya existe en vez de pedirla otra vez", async () => {
    montar({ producto: AZULITO, guardada: GUARDADA });

    await waitFor(() => expect(cantidadDe(/cantidad de alcohol de caña/i)).toHaveValue("60"));
    expect(cantidadDe(/cantidad de curazao azul/i)).toHaveValue("30");
  });

  it("quita un renglón sin tocar los demás", async () => {
    const { user } = montar({ producto: AZULITO, guardada: GUARDADA });

    await waitFor(() => expect(cantidadDe(/cantidad de alcohol de caña/i)).toHaveValue("60"));
    await user.click(screen.getByRole("button", { name: /quitar alcohol de caña/i }));

    expect(screen.queryByLabelText(/cantidad de alcohol de caña/i)).not.toBeInTheDocument();
    expect(cantidadDe(/cantidad de curazao azul/i)).toHaveValue("30");
  });

  it("no deja repetir un insumo: el par producto+insumo es único", async () => {
    montar({ producto: AZULITO, guardada: GUARDADA });

    const yaEsta = await screen.findByRole("button", { name: /agregar alcohol de caña/i });
    expect(yaEsta).toBeDisabled();
    expect(yaEsta).toHaveTextContent(/ya está en la receta/i);

    expect(screen.getByRole("button", { name: /agregar jugo de limón/i })).toBeEnabled();
  });

  it("guardar sin insumos borra la receta, y lo avisa antes", async () => {
    putMock.mockResolvedValue([]);
    const { user } = montar({ producto: AZULITO });

    expect(screen.getByText(/guardar borra la receta/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /guardar receta/i }));

    await waitFor(() =>
      expect(putMock).toHaveBeenCalledWith("/recetas/producto/7", { insumos: [] }),
    );
  });

  it("no deja guardar un insumo sin cantidad", async () => {
    const { user } = montar({ producto: AZULITO });

    await agregar(user, /agregar alcohol de caña/i);

    expect(screen.getByRole("button", { name: /falta la cantidad/i })).toBeDisabled();
  });
});

describe("RecetaProductoDialog · costo estimado", () => {
  it("suma el costo de los insumos por su cantidad", async () => {
    const { user } = montar({ producto: AZULITO });

    await agregar(user, /agregar alcohol de caña/i);
    await user.type(cantidadDe(/cantidad de alcohol de caña/i), "60");

    // 60 ml × $0.09 = $5.40
    expect(await screen.findByText("$5.40")).toBeVisible();
  });

  it("avisa cuando un insumo no tiene costo y la suma sale corta", async () => {
    const { user } = montar({ producto: AZULITO });

    await agregar(user, /agregar alcohol de caña/i);
    await user.type(cantidadDe(/cantidad de alcohol de caña/i), "60");
    await agregar(user, /agregar jugo de limón/i);
    await user.type(cantidadDe(/cantidad de jugo de limón/i), "20");

    // Lo que se sabe se muestra ($5.40 del alcohol), pero dice que va incompleto.
    expect(await screen.findByText("$5.40")).toBeVisible();
    expect(await screen.findByText(/falta el costo de algún insumo/i)).toBeVisible();
  });

  /**
   * El cero con confianza: sin ningún costo capturado la suma da cero, pero eso no
   * es que la receta salga gratis. Se dice que no hay con qué calcularlo.
   */
  it("no pinta $0.00 cuando ningún insumo tiene costo capturado", async () => {
    const { user } = montar({ producto: AZULITO });

    await agregar(user, /agregar jugo de limón/i);
    await user.type(cantidadDe(/cantidad de jugo de limón/i), "20");

    expect(await screen.findByText(/no hay con qué calcularlo/i)).toBeVisible();
    expect(screen.queryByText("$0.00")).not.toBeInTheDocument();
  });
});

describe("RecetaProductoDialog · qué se ofrece", () => {
  it("solo pide insumos controlados", async () => {
    montar({ producto: AZULITO });

    await waitFor(() => expect(getMock).toHaveBeenCalledWith("/insumos", expect.anything()));
    const insumos = getMock.mock.calls.filter((c) => c[0] === "/insumos").at(-1);
    // Los de consumo se echan al tanteo: una receta sobre ellos no descuenta nada.
    expect(insumos?.[1]?.params?.tipo).toBe("controlado");
  });

  it("abre directo en el producto, sin preguntar cuál ni buscar productos", async () => {
    montar({ producto: { id: 7, nombre: "Michelada con corona" } });

    expect(await screen.findByText("Receta de Michelada con corona")).toBeVisible();
    // El buscador de productos se fue: se entra desde la fila de la lista.
    expect(screen.queryByLabelText(/buscar producto/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cambiar/i })).not.toBeInTheDocument();
    expect(getMock.mock.calls.some((c) => c[0] === "/productos")).toBe(false);
  });
});

/**
 * El defecto que motivó esta versión: había un campo de texto y, aparte, un `select`
 * cerrado. Al teclear no pasaba nada visible — el filtro ocurría donde nadie lo veía.
 */
describe("RecetaProductoDialog · buscar tiene efecto visible", () => {
  it("al teclear, las coincidencias se ven sin abrir ningún desplegable", async () => {
    const { user } = montar({ producto: AZULITO });

    // Antes de escribir se ofrece el almacén; al escribir, solo lo que coincide.
    await screen.findByRole("button", { name: /agregar alcohol de caña/i });

    await user.type(screen.getByLabelText(/buscar insumo/i), "curazao");

    expect(await screen.findByRole("button", { name: /agregar curazao azul/i })).toBeVisible();
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /agregar alcohol de caña/i }),
      ).not.toBeInTheDocument(),
    );
  });

  it("al agregar un insumo se limpia el buscador, listo para el siguiente", async () => {
    const { user } = montar({ producto: AZULITO });

    const buscador = screen.getByLabelText(/buscar insumo/i);
    await user.type(buscador, "curazao");
    await agregar(user, /agregar curazao azul/i);

    expect(buscador).toHaveValue("");
  });

  it("conserva el insumo agregado aunque la búsqueda deje de traerlo", async () => {
    const { user } = montar({ producto: AZULITO });

    await agregar(user, /agregar alcohol de caña/i);
    await user.type(cantidadDe(/cantidad de alcohol de caña/i), "60");
    expect(await screen.findByText("$5.40")).toBeVisible();

    // "curazao" ya no trae el alcohol: si el renglón dependiera de los resultados,
    // se quedaría sin nombre y el costo estimado bajaría solo.
    await user.type(screen.getByLabelText(/buscar insumo/i), "curazao");
    await screen.findByRole("button", { name: /agregar curazao azul/i });

    expect(cantidadDe(/cantidad de alcohol de caña/i)).toHaveValue("60");
    expect(screen.getByText("$5.40")).toBeVisible();
  });

  it("dice que no hay coincidencias en vez de dejar un hueco en blanco", async () => {
    const { user } = montar({ producto: AZULITO });

    await user.type(screen.getByLabelText(/buscar insumo/i), "tamarindo");

    expect(await screen.findByText(/ningún insumo controlado coincide/i)).toBeVisible();
  });

});
