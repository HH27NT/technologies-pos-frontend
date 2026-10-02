import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { limpiarSesion, renderConProviders } from "@/test/utils";
import { ProductosPage } from "./ProductosPage";
import type { ProductoRecurso } from "../types";
import type { CategoriaRecurso } from "@/features/categorias";

/**
 * Productos (M06). Lo que se protege aquí es el filtro por categoría del 2026-09-03:
 * que filtre **en el servidor** (el parámetro que sale en la petición), que vuelva a
 * la página 1 al cambiar de categoría, y que el estado vacío con filtro puesto no
 * invite a crear un producto que ya existe en otra categoría.
 */

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock("@/lib/api/client", () => ({
  client: { get: getMock, post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}));

const CATEGORIAS: CategoriaRecurso[] = [
  { id: 1, nombre: "Cervezas", orden_display: 1, activo: true },
  { id: 2, nombre: "Mezcales", orden_display: 2, activo: true },
  { id: 3, nombre: "Temporada", orden_display: 3, activo: false },
];

function producto(id: number, nombre: string, idCategoria: number): ProductoRecurso {
  const categoria = CATEGORIAS.find((c) => c.id === idCategoria)!;
  return {
    id,
    id_categoria: idCategoria,
    nombre,
    descripcion: null,
    precio_venta: "45.00",
    costo_referencia: null,
    controla_inventario: false,
    disponible: true,
    sku: null,
    categoria: {
      id: categoria.id,
      nombre: categoria.nombre,
      orden_display: categoria.orden_display,
      activo: categoria.activo,
    },
  };
}

const PRODUCTOS = [
  producto(1, "Cerveza clara", 1),
  producto(2, "Mezcal espadín", 2),
];

/** Envelope ya desenvuelto por el cliente Axios (regla de oro #1). */
function pagina(data: ProductoRecurso[] | CategoriaRecurso[], lastPage = 1) {
  return {
    data,
    meta: { current_page: 1, per_page: 15, total: data.length, last_page: lastPage },
    links: { first: null, last: null, prev: null, next: null },
  };
}

interface Peticion {
  params?: Record<string, unknown>;
}

/** Responde /categorias y /productos, filtrando por el mismo parámetro que el backend. */
function montar(productos: ProductoRecurso[] = PRODUCTOS, lastPage = 1) {
  getMock.mockImplementation((url: string, config?: Peticion) => {
    if (url === "/categorias") return Promise.resolve(pagina(CATEGORIAS));
    const idCategoria = config?.params?.id_categoria as number | undefined;
    const buscar = (config?.params?.buscar as string | undefined)?.toLowerCase();
    let filtrados = idCategoria
      ? productos.filter((p) => p.id_categoria === idCategoria)
      : productos;
    // Se imita al backend: busca en nombre y SKU, sin distinguir mayúsculas.
    if (buscar) {
      filtrados = filtrados.filter(
        (p) =>
          p.nombre.toLowerCase().includes(buscar) ||
          (p.sku ?? "").toLowerCase().includes(buscar),
      );
    }
    const acotado = Boolean(idCategoria) || Boolean(buscar);
    return Promise.resolve(pagina(filtrados, acotado ? 1 : lastPage));
  });
  // El enlace "Cargar menú" necesita contexto de router.
  renderConProviders(
    <MemoryRouter>
      <ProductosPage />
    </MemoryRouter>,
    { permisos: ["productos.gestionar"] },
  );
  return userEvent.setup();
}

/**
 * `DataTable` pinta las filas DOS veces —tabla desde `md`, tarjetas por debajo— y el
 * CSS decide cuál se ve, así que en jsdom todo está duplicado: hay que acotar las
 * búsquedas a la tabla o cada consulta devuelve dos elementos.
 */
const tabla = () => screen.getByRole("table");
const filtro = () => screen.getByRole("group", { name: /filtrar por categoría/i });
const pildora = (nombre: RegExp) => within(filtro()).getByRole("button", { name: nombre });
const listaLista = () =>
  waitFor(() => expect(within(tabla()).getByText("Cerveza clara")).toBeInTheDocument());

afterEach(() => {
  getMock.mockReset();
  limpiarSesion();
});

describe("ProductosPage · filtro por categoría", () => {
  it("empieza en 'Todas' y ofrece una píldora por categoría, en el orden de venta", async () => {
    montar();
    await listaLista();

    const etiquetas = within(filtro())
      .getAllByRole("button")
      .map((b) => b.textContent);
    // "Todas" primero; las demás por orden_display, no alfabéticas.
    expect(etiquetas).toEqual(["Todas", "Cervezas", "Mezcales", "Temporada (inactiva)"]);
    expect(pildora(/^todas$/i)).toHaveAttribute("aria-pressed", "true");
  });

  it("filtra en el servidor: la petición lleva id_categoria", async () => {
    const user = montar();
    await listaLista();

    await user.click(pildora(/^mezcales$/i));

    await waitFor(() =>
      expect(getMock).toHaveBeenCalledWith("/productos", {
        params: { page: 1, id_categoria: 2 },
      }),
    );
    await waitFor(() => expect(within(tabla()).queryByText("Cerveza clara")).toBeNull());
    expect(pildora(/^mezcales$/i)).toHaveAttribute("aria-pressed", "true");
  });

  it("vuelve a la página 1 al cambiar de categoría", async () => {
    const user = montar(PRODUCTOS, 3);
    await listaLista();

    await user.click(screen.getAllByRole("button", { name: /siguiente/i })[0]);
    await waitFor(() =>
      expect(getMock).toHaveBeenCalledWith("/productos", { params: { page: 2 } }),
    );

    await user.click(pildora(/^cervezas$/i));

    // Sin el reseteo se pediría la página 2 de una categoría que rara vez la tiene.
    await waitFor(() =>
      expect(getMock).toHaveBeenCalledWith("/productos", {
        params: { page: 1, id_categoria: 1 },
      }),
    );
    expect(getMock).not.toHaveBeenCalledWith("/productos", {
      params: { page: 2, id_categoria: 1 },
    });
  });

  it("con filtro puesto y sin resultados no invita a crear, ofrece quitar el filtro", async () => {
    const user = montar();
    await listaLista();

    await user.click(pildora(/temporada/i));

    const vacio = await screen.findByText(/sin productos en esta categoría/i);
    expect(vacio).toBeInTheDocument();
    expect(screen.queryByText(/aún no hay productos/i)).toBeNull();

    await user.click(screen.getByRole("button", { name: /ver todos/i }));
    await listaLista();
    expect(pildora(/^todas$/i)).toHaveAttribute("aria-pressed", "true");
  });

  it("sin filtro y sin catálogo sí invita a crear el primer producto", async () => {
    montar([]);
    expect(await screen.findByText(/aún no hay productos/i)).toBeInTheDocument();
  });
});

describe("ProductosPage · buscador", () => {
  it("busca en el servidor, no sobre la página visible", async () => {
    const user = montar();
    await listaLista();

    await user.type(screen.getByLabelText(/buscar productos/i), "mezcal");

    // Un solo término al final: el debounce descarta las letras intermedias.
    await waitFor(() =>
      expect(getMock).toHaveBeenCalledWith("/productos", {
        params: { page: 1, buscar: "mezcal" },
      }),
    );
    await waitFor(() => expect(within(tabla()).queryByText("Cerveza clara")).toBeNull());
    expect(within(tabla()).getByText("Mezcal espadín")).toBeInTheDocument();
  });

  it("combina la búsqueda con la categoría elegida", async () => {
    const user = montar();
    await listaLista();

    await user.click(pildora(/^mezcales$/i));
    await user.type(screen.getByLabelText(/buscar productos/i), "espadín");

    await waitFor(() =>
      expect(getMock).toHaveBeenCalledWith("/productos", {
        params: { page: 1, id_categoria: 2, buscar: "espadín" },
      }),
    );
  });

  it("sin resultados no invita a crear: ofrece soltar el término", async () => {
    const user = montar();
    await listaLista();

    await user.type(screen.getByLabelText(/buscar productos/i), "tequila");

    expect(await screen.findByText(/sin resultados para «tequila»/i)).toBeInTheDocument();
    expect(screen.queryByText(/aún no hay productos/i)).toBeNull();

    await user.click(screen.getByRole("button", { name: /limpiar búsqueda/i }));
    await listaLista();
    expect(screen.getByLabelText(/buscar productos/i)).toHaveValue("");
  });

  it("vuelve a la página 1 al buscar", async () => {
    const user = montar(PRODUCTOS, 3);
    await listaLista();

    await user.click(screen.getAllByRole("button", { name: /siguiente/i })[0]);
    await waitFor(() =>
      expect(getMock).toHaveBeenCalledWith("/productos", { params: { page: 2 } }),
    );

    await user.type(screen.getByLabelText(/buscar productos/i), "cerveza");

    await waitFor(() =>
      expect(getMock).toHaveBeenCalledWith("/productos", {
        params: { page: 1, buscar: "cerveza" },
      }),
    );
    expect(getMock).not.toHaveBeenCalledWith("/productos", {
      params: { page: 2, buscar: "cerveza" },
    });
  });
});
