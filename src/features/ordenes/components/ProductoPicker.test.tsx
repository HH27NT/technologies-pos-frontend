import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { limpiarSesion, renderConProviders } from "@/test/utils";
import { ProductoPicker } from "./ProductoPicker";

/**
 * El POS pedía una sola página de 100 productos y filtraba las categorías en memoria:
 * un bar con 140 productos no podía vender los 40 últimos, y una categoría cuyos
 * productos cayeran fuera de esas 100 filas se pintaba vacía. Estos tests fijan que
 * el catálogo se agote y que se pueda buscar en él.
 */

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));
vi.mock("@/lib/api/client", () => ({
  client: { get: getMock, post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}));

/** Producto mínimo con la forma del Resource del backend. */
function producto(id: number, nombre: string, idCategoria = 1, sku: string | null = null) {
  return {
    id,
    id_categoria: idCategoria,
    nombre,
    descripcion: null,
    precio_venta: "45.00",
    costo_referencia: null,
    controla_inventario: false,
    disponible: true,
    sku,
    categoria: { id: idCategoria, nombre: "Cervezas", orden_display: 1, activo: true },
  };
}

function pagina(datos: ReturnType<typeof producto>[], actual: number, ultima: number) {
  return {
    data: datos,
    meta: { current_page: actual, per_page: 100, total: 100 * ultima, last_page: ultima },
    links: { first: null, last: null, prev: null, next: null },
  };
}

const CATEGORIAS = {
  data: [
    { id: 1, nombre: "Cervezas", orden_display: 1, activo: true },
    { id: 2, nombre: "Postres", orden_display: 2, activo: true },
  ],
  meta: { current_page: 1, per_page: 100, total: 2, last_page: 1 },
  links: { first: null, last: null, prev: null, next: null },
};

/** Catálogo de 101 productos: los 100 primeros en Cervezas y el 101 en Postres. */
function montarCatalogoDeDosPaginas() {
  const primera = Array.from({ length: 100 }, (_, i) => producto(i + 1, `Cerveza ${i + 1}`));
  const segunda = [producto(101, "Flan napolitano", 2, "FLAN-01")];

  getMock.mockImplementation((ruta: string, config?: { params?: Record<string, unknown> }) => {
    if (ruta === "/categorias") return Promise.resolve(CATEGORIAS);
    if (ruta === "/productos") {
      const page = config?.params?.page ?? 1;
      return Promise.resolve(page === 1 ? pagina(primera, 1, 2) : pagina(segunda, 2, 2));
    }
    return Promise.resolve(pagina([], 1, 1));
  });
}

afterEach(() => {
  getMock.mockReset();
  limpiarSesion();
});

describe("ProductoPicker", () => {
  it("agota las páginas: el producto 101 se puede vender", async () => {
    montarCatalogoDeDosPaginas();
    renderConProviders(<ProductoPicker onAdd={vi.fn()} />);

    // El de la primera página aparece enseguida; el de la segunda, tras encadenarla.
    expect(await screen.findByText("Cerveza 1")).toBeInTheDocument();
    expect(await screen.findByText("Flan napolitano")).toBeInTheDocument();
  });

  it("la categoría cuyos productos caen en la página 2 no se pinta vacía", async () => {
    montarCatalogoDeDosPaginas();
    const user = userEvent.setup();
    renderConProviders(<ProductoPicker onAdd={vi.fn()} />);
    await screen.findByText("Flan napolitano");

    await user.click(screen.getByRole("button", { name: "Postres" }));

    expect(screen.getByText("Flan napolitano")).toBeInTheDocument();
    expect(screen.queryByText("Cerveza 1")).not.toBeInTheDocument();
  });

  it("busca sin acentos y por SKU, ignorando la categoría activa", async () => {
    montarCatalogoDeDosPaginas();
    const user = userEvent.setup();
    renderConProviders(<ProductoPicker onAdd={vi.fn()} />);
    await screen.findByText("Flan napolitano");

    // Con "Cervezas" activa, buscar el postre igual lo encuentra.
    await user.click(screen.getByRole("button", { name: "Cervezas" }));
    await user.type(screen.getByLabelText("Buscar producto"), "NAPOLITANO");

    expect(screen.getByText("Flan napolitano")).toBeInTheDocument();
    expect(screen.queryByText("Cerveza 1")).not.toBeInTheDocument();
  });

  it("una búsqueda sin resultados lo dice, en vez de fingir catálogo vacío", async () => {
    montarCatalogoDeDosPaginas();
    const user = userEvent.setup();
    renderConProviders(<ProductoPicker onAdd={vi.fn()} />);
    await screen.findByText("Flan napolitano");

    await user.type(screen.getByLabelText("Buscar producto"), "sushi");

    expect(screen.getByText("Nada coincide")).toBeInTheDocument();
    expect(screen.getByText(/Ningún producto disponible coincide/)).toBeInTheDocument();
  });

  it("agrega el producto tocado", async () => {
    montarCatalogoDeDosPaginas();
    const onAdd = vi.fn();
    const user = userEvent.setup();
    renderConProviders(<ProductoPicker onAdd={onAdd} />);
    await screen.findByText("Flan napolitano");

    await user.click(screen.getByText("Flan napolitano"));

    await waitFor(() => expect(onAdd).toHaveBeenCalledWith(101));
  });
});
