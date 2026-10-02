import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { limpiarSesion, renderConProviders } from "@/test/utils";
import { CategoriasPage } from "./CategoriasPage";
import type { CategoriaRecurso } from "../types";

/**
 * Categorías (M05). Lo que se protege aquí es la decisión de UX del 2026-09-01: el
 * formulario **dejó de preguntar la posición** (la calcula: al final) y el orden se
 * cambia en la tabla con flechas. Los tests miran el payload que sale al backend,
 * que es donde se nota si la posición se pierde o se inventa.
 */

const { getMock, postMock, putMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  putMock: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  client: { get: getMock, post: postMock, put: putMock, patch: vi.fn() },
}));

const CATEGORIAS: CategoriaRecurso[] = [
  { id: 1, nombre: "Cervezas", orden_display: 1, activo: true },
  { id: 2, nombre: "Bebidas preparadas", orden_display: 2, activo: true },
];

function montar(data: CategoriaRecurso[] = CATEGORIAS) {
  getMock.mockResolvedValue({
    data,
    meta: { current_page: 1, per_page: 15, total: data.length, last_page: 1 },
    links: { first: null, last: null, prev: null, next: null },
  });
  postMock.mockResolvedValue(CATEGORIAS[0]);
  putMock.mockResolvedValue(CATEGORIAS[0]);
  renderConProviders(<CategoriasPage />, { permisos: ["categorias.gestionar"] });
  return userEvent.setup();
}

/**
 * `DataTable` pinta las filas DOS veces —tabla desde `md`, tarjetas por debajo— y
 * el CSS decide cuál se ve, así que en jsdom todo está duplicado: hay que acotar
 * las búsquedas a la tabla o cada consulta devuelve dos elementos.
 */
const tabla = () => screen.getByRole("table");
const fila = (nombre: string) => within(tabla()).getByRole("row", { name: new RegExp(nombre) });
const listaLista = () => waitFor(() => expect(within(tabla()).getByText("Cervezas")).toBeInTheDocument());

afterEach(() => {
  getMock.mockReset();
  postMock.mockReset();
  putMock.mockReset();
  limpiarSesion();
});

describe("CategoriasPage · alta sin preguntar la posición", () => {
  it("no muestra el campo de orden y crea al final de la lista", async () => {
    const user = montar();
    await listaLista();

    await user.click(screen.getAllByRole("button", { name: /nueva categoría/i })[0]);

    const dialogo = await screen.findByRole("dialog");
    expect(within(dialogo).queryByLabelText(/orden/i)).not.toBeInTheDocument();

    await user.type(within(dialogo).getByLabelText(/nombre/i), "Mezcales");
    await user.click(within(dialogo).getByRole("button", { name: /guardar/i }));

    // Las existentes van en 1 y 2, así que la nueva es la 3.
    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith("/categorias", {
        nombre: "Mezcales",
        orden_display: 3,
      }),
    );
  });

  // Sin categorías previas la lista está vacía: el reduce no debe devolver -Infinity
  // ni 0 (el backend pide entero ≥ 0, pero la primera posición útil es 1).
  it("la primera categoría de todas se crea en la posición 1", async () => {
    const user = montar([]);
    await waitFor(() => expect(getMock).toHaveBeenCalled());

    await user.click(screen.getAllByRole("button", { name: /nueva categoría/i })[0]);
    const dialogo = await screen.findByRole("dialog");
    await user.type(within(dialogo).getByLabelText(/nombre/i), "Cervezas");
    await user.click(within(dialogo).getByRole("button", { name: /guardar/i }));

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith("/categorias", {
        nombre: "Cervezas",
        orden_display: 1,
      }),
    );
  });
});

describe("CategoriasPage · orden en la tabla", () => {
  it("subir una fila renumera solo las dos que cambian", async () => {
    const user = montar();
    await listaLista();

    await user.click(within(fila("Bebidas preparadas")).getByRole("button", { name: /^Subir/ }));

    await waitFor(() => expect(putMock).toHaveBeenCalledTimes(2));
    expect(putMock).toHaveBeenCalledWith("/categorias/2", {
      nombre: "Bebidas preparadas",
      orden_display: 1,
    });
    expect(putMock).toHaveBeenCalledWith("/categorias/1", {
      nombre: "Cervezas",
      orden_display: 2,
    });
  });

  // Los extremos no tienen a dónde ir: el botón se apaga en vez de mandar un PUT
  // que no cambia nada.
  it("la primera no puede subir y la última no puede bajar", async () => {
    montar();
    await listaLista();

    expect(within(fila("Cervezas")).getByRole("button", { name: /^Subir/ })).toBeDisabled();
    expect(
      within(fila("Bebidas preparadas")).getByRole("button", { name: /^Bajar/ }),
    ).toBeDisabled();
  });

  // Una categoría inactiva no se muestra en venta, así que moverla no cambiaría
  // nada: el control se apaga en vez de prometer un efecto que no va a ocurrir.
  it("una categoría inactiva no se puede mover", async () => {
    montar([
      { id: 1, nombre: "Cervezas", orden_display: 1, activo: true },
      { id: 2, nombre: "Bebidas preparadas", orden_display: 2, activo: false },
      { id: 3, nombre: "Mezcales", orden_display: 3, activo: true },
    ]);
    await listaLista();

    const inactiva = within(fila("Bebidas preparadas"));
    expect(inactiva.getByRole("button", { name: /^Subir/ })).toBeDisabled();
    expect(inactiva.getByRole("button", { name: /^Bajar/ })).toBeDisabled();

    // Y la de en medio activa sí conserva las dos flechas.
    expect(within(fila("Mezcales")).getByRole("button", { name: /^Subir/ })).toBeEnabled();
  });

  // La posición vive ahora fuera del formulario: al editar el nombre hay que
  // reenviarla, o el backend la perdería.
  it("editar el nombre conserva la posición que ya tenía", async () => {
    const user = montar();
    await listaLista();

    await user.click(within(fila("Bebidas preparadas")).getByRole("button", { name: /acciones/i }));
    await user.click(await screen.findByRole("menuitem", { name: /editar/i }));

    const dialogo = await screen.findByRole("dialog");
    const nombre = within(dialogo).getByLabelText(/nombre/i);
    await user.clear(nombre);
    await user.type(nombre, "Cocteles");
    await user.click(within(dialogo).getByRole("button", { name: /guardar/i }));

    await waitFor(() =>
      expect(putMock).toHaveBeenCalledWith("/categorias/2", {
        nombre: "Cocteles",
        orden_display: 2,
      }),
    );
  });
});
