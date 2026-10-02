import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { limpiarSesion, renderConProviders } from "@/test/utils";
import { CargarMenuPage } from "./CargarMenuPage";
import type { CategoriaRecurso } from "@/features/categorias";
import type { ProductoRecurso } from "../types";
import type { UnidadRecurso } from "@/features/unidades";

/**
 * Rejilla "Cargar menú" (M06, Fase B). Lo que se protege aquí es la promesa del
 * bloque: que un menú pegado desde Excel o WhatsApp se convierta en filas, que nada
 * viaje sin revisión, y que el guardado sea **una sola petición** al endpoint por
 * lotes — si se partiera en peticiones sueltas volverían los fallos parciales que
 * este bloque existe para evitar.
 */

const { getMock, postMock } = vi.hoisted(() => ({ getMock: vi.fn(), postMock: vi.fn() }));

vi.mock("@/lib/api/client", () => ({
  client: { get: getMock, post: postMock, put: vi.fn(), patch: vi.fn() },
}));

const CATEGORIAS: CategoriaRecurso[] = [
  { id: 1, nombre: "Cervezas", orden_display: 1, activo: true },
  { id: 2, nombre: "Destilados", orden_display: 2, activo: true },
];

/** "Pieza" es global y viene sembrada; es la que el atajo del almacén elige solo. */
const UNIDADES: UnidadRecurso[] = [
  { id: 4, nombre: "Litro", abreviacion: "l", es_global: true },
  { id: 5, nombre: "Pieza", abreviacion: "pza", es_global: true },
];

/** Envelope ya desenvuelto por el cliente Axios (regla de oro #1). */
function pagina<T>(data: T[]) {
  return {
    data,
    meta: { current_page: 1, per_page: 100, total: data.length, last_page: 1 },
    links: { first: null, last: null, prev: null, next: null },
  };
}

function producto(id: number, nombre: string): ProductoRecurso {
  return {
    id,
    id_categoria: 1,
    nombre,
    descripcion: null,
    precio_venta: "45.00",
    costo_referencia: null,
    controla_inventario: false,
    disponible: true,
    sku: null,
    categoria: { id: 1, nombre: "Cervezas", orden_display: 1, activo: true },
  };
}

function montar(existentes: ProductoRecurso[] = [], unidades: UnidadRecurso[] = UNIDADES) {
  // Sin responder /unidades-medida el atajo del almacén no se ofrece y los tests que
  // lo tocan pasarían por la razón equivocada.
  getMock.mockImplementation((url: string) => {
    if (url === "/categorias") return Promise.resolve(pagina(CATEGORIAS));
    if (url === "/productos") return Promise.resolve(pagina(existentes));
    if (url === "/unidades-medida") return Promise.resolve(pagina(unidades));
    return Promise.resolve(pagina([]));
  });

  return renderConProviders(
    <MemoryRouter>
      <CargarMenuPage />
    </MemoryRouter>,
    { permisos: ["productos.gestionar"] },
  );
}

/** Pega texto en la primera celda de nombre, que es como llega un menú de verdad. */
async function pegarEnLaRejilla(user: ReturnType<typeof userEvent.setup>, texto: string) {
  await user.click(screen.getByRole("textbox", { name: /nombre del producto 1/i }));
  await user.paste(texto);
}

afterEach(() => {
  vi.clearAllMocks();
  limpiarSesion();
});

describe("CargarMenuPage", () => {
  it("convierte un menú pegado en una fila por producto", async () => {
    const user = userEvent.setup();
    montar();
    await screen.findByRole("textbox", { name: /nombre del producto 1/i });

    await pegarEnLaRejilla(user, "Corona 45\nVictoria 42\nModelo 48");

    expect(await screen.findByDisplayValue("Corona")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Victoria")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Modelo")).toBeInTheDocument();
    expect(screen.getByText("3 productos por crear")).toBeInTheDocument();
  });

  it("guarda todo el lote en una sola petición", async () => {
    const user = userEvent.setup();
    postMock.mockResolvedValue([producto(1, "Corona"), producto(2, "Victoria")]);
    montar();
    await screen.findByRole("textbox", { name: /nombre del producto 1/i });

    await pegarEnLaRejilla(user, "Corona 45\nVictoria 42");
    await user.click(screen.getByRole("button", { name: /guardar productos/i }));

    await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1));
    expect(postMock).toHaveBeenCalledWith("/productos/lote", {
      productos: [
        { nombre: "Corona", id_categoria: 1, precio_venta: 45 },
        { nombre: "Victoria", id_categoria: 1, precio_venta: 42 },
      ],
    });
  });

  it("no envía nada si falta el precio de alguna fila", async () => {
    const user = userEvent.setup();
    montar();
    await screen.findByRole("textbox", { name: /nombre del producto 1/i });

    // "Michelada" viene sin precio: el parser no lo inventa y la rejilla lo marca.
    await pegarEnLaRejilla(user, "Corona 45\nMichelada");
    await user.click(screen.getByRole("button", { name: /guardar productos/i }));

    expect(await screen.findByText("Falta el precio.")).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();
  });

  it("avisa de los nombres que ya existen en el catálogo, sin bloquear", async () => {
    const user = userEvent.setup();
    // Con acento y mayúsculas distintas: para quien captura es el mismo producto.
    montar([producto(1, "Café de olla")]);
    await screen.findByRole("textbox", { name: /nombre del producto 1/i });

    await pegarEnLaRejilla(user, "CAFE DE OLLA 35\nCorona 45");

    expect(await screen.findByText(/ya existe con ese nombre/i)).toBeInTheDocument();
    expect(screen.getByText(/1 nombre ya existe/i)).toBeInTheDocument();
    // Avisar no es impedir: la decisión es de quien carga el menú.
    expect(screen.getByRole("button", { name: /guardar productos/i })).toBeEnabled();
  });

  it("marca también los repetidos dentro del propio pegado", async () => {
    const user = userEvent.setup();
    montar();
    await screen.findByRole("textbox", { name: /nombre del producto 1/i });

    await pegarEnLaRejilla(user, "Corona 45\nVictoria 42\nCorona 45");

    // Solo la segunda aparición: la primera es el producto legítimo.
    expect(await screen.findAllByText(/ya existe con ese nombre/i)).toHaveLength(1);
  });

  it("reparte por categoría cuando el pegado trae encabezados de sección", async () => {
    const user = userEvent.setup();
    montar();
    await screen.findByRole("textbox", { name: /nombre del producto 1/i });

    await pegarEnLaRejilla(user, "CERVEZAS\nCorona 45\nDestilados:\nMezcal 90");

    await screen.findByDisplayValue("Corona");
    expect(screen.getByRole("combobox", { name: /categoría del producto 1/i })).toHaveTextContent(
      "Cervezas",
    );
    expect(screen.getByRole("combobox", { name: /categoría del producto 2/i })).toHaveTextContent(
      "Destilados",
    );
  });

  it("Enter agrega una fila nueva y le da el foco, en vez de enviar el formulario", async () => {
    const user = userEvent.setup();
    montar();
    const primera = await screen.findByRole("textbox", { name: /nombre del producto 1/i });

    await user.type(primera, "Corona{Enter}");

    const segunda = await screen.findByRole("textbox", { name: /nombre del producto 2/i });
    expect(segunda).toBeInTheDocument();
    // El foco es la mitad del valor: sin él hay que ir al ratón en cada renglón, que es
    // justo lo que hace lenta la carga. La primera versión creaba la fila y dejaba el
    // foco atrás; se vio en el navegador, no aquí, porque el test no lo comprobaba.
    expect(segunda).toHaveFocus();
    expect(postMock).not.toHaveBeenCalled();
  });

  it("marca la fila exacta que el backend rechazó", async () => {
    const user = userEvent.setup();
    postMock.mockRejectedValue({
      status: 422,
      message: "Los datos no son válidos.",
      errors: { "productos.1.nombre": ["El nombre no puede pasar de 120 caracteres."] },
    });
    montar();
    await screen.findByRole("textbox", { name: /nombre del producto 1/i });

    await pegarEnLaRejilla(user, "Corona 45\nVictoria 42");
    await user.click(screen.getByRole("button", { name: /guardar productos/i }));

    // Sin el índice, la persona tendría que adivinar cuál de las filas está mal.
    expect(
      await screen.findByText("El nombre no puede pasar de 120 caracteres."),
    ).toBeInTheDocument();
  });

  it("manda a crear una categoría cuando no hay ninguna", async () => {
    getMock.mockImplementation((url: string) => {
      if (url === "/categorias") return Promise.resolve(pagina([]));
      return Promise.resolve(pagina([]));
    });
    renderConProviders(
      <MemoryRouter>
        <CargarMenuPage />
      </MemoryRouter>,
      { permisos: ["productos.gestionar"] },
    );

    // Dejar escribir para fallar al guardar sería una trampa: sin categoría no hay
    // dónde poner el producto.
    expect(await screen.findByText(/primero crea una categoría/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: /nombre del producto 1/i }),
    ).not.toBeInTheDocument();
  });

  it("con el atajo del almacén, cada fila crea también su insumo", async () => {
    const user = userEvent.setup();
    postMock.mockResolvedValue([producto(1, "Corona")]);
    montar();
    await screen.findByRole("textbox", { name: /nombre del producto 1/i });

    await pegarEnLaRejilla(user, "Corona 45\nVictoria 42");
    await user.click(await screen.findByLabelText(/salen del almacén tal cual/i));
    // La columna de costo solo aparece cuando hay dónde guardar ese número, y es
    // opcional: la segunda fila se guarda sin él.
    await user.type(await screen.findByRole("textbox", { name: /costo del producto 1/i }), "22");
    await user.click(screen.getByRole("button", { name: /guardar productos/i }));

    await waitFor(() => expect(postMock).toHaveBeenCalled());
    expect(postMock).toHaveBeenCalledWith("/productos/lote", {
      productos: [
        {
          nombre: "Corona",
          id_categoria: 1,
          precio_venta: 45,
          insumo: { id_unidad_medida: 5, costo_unitario: 22 },
        },
        {
          nombre: "Victoria",
          id_categoria: 1,
          precio_venta: 42,
          insumo: { id_unidad_medida: 5 },
        },
      ],
    });
  });

  it("sin el atajo no pide costo ni manda insumo", async () => {
    const user = userEvent.setup();
    postMock.mockResolvedValue([producto(1, "Corona")]);
    montar();
    await screen.findByRole("textbox", { name: /nombre del producto 1/i });

    await pegarEnLaRejilla(user, "Corona 45\nVictoria 42");

    expect(screen.queryByRole("textbox", { name: /costo del producto 1/i })).toBeNull();
    await user.click(screen.getByRole("button", { name: /guardar productos/i }));

    await waitFor(() => expect(postMock).toHaveBeenCalled());
    expect(postMock.mock.calls[0][1].productos[0].insumo).toBeUndefined();
  });

  it("esconde el atajo si no hay ninguna unidad", async () => {
    // Ofrecerlo sin unidad sería prometer algo que el backend rechazaría al guardar.
    montar([], []);
    await screen.findByRole("textbox", { name: /nombre del producto 1/i });

    expect(screen.queryByLabelText(/salen del almacén tal cual/i)).toBeNull();
  });
});
