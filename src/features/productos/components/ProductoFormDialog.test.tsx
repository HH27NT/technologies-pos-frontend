import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { limpiarSesion, renderConProviders } from "@/test/utils";
import { ProductoFormDialog } from "./ProductoFormDialog";
import type { ProductoRecurso } from "../types";
import type { CategoriaRecurso } from "@/features/categorias";
import type { UnidadRecurso } from "@/features/unidades";

/**
 * Alta y edición de producto (M06). Lo que se protege aquí es la Fase A del
 * 2026-09-04: el camino corto (nombre, categoría, precio), el alta encadenada, la
 * categoría creada sin salir del formulario, y que los dos campos que dependen del
 * inventario digan la verdad. Desde el 2026-09-05 protege también el atajo "sale del
 * almacén", que crea el insumo y la receta 1:1 junto con el producto.
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
  { id: 2, nombre: "Mezcales", orden_display: 2, activo: true },
];

const PRODUCTO_CON_INVENTARIO: ProductoRecurso = {
  id: 7,
  id_categoria: 1,
  nombre: "Michelada",
  descripcion: null,
  precio_venta: "60.00",
  costo_referencia: null,
  controla_inventario: true,
  disponible: true,
  sku: null,
  categoria: { id: 1, nombre: "Cervezas", orden_display: 1, activo: true },
};

/** "Pieza" es global y viene sembrada; es la unidad que el atajo elige solo. */
const UNIDADES: UnidadRecurso[] = [
  { id: 4, nombre: "Litro", abreviacion: "l", es_global: true },
  { id: 5, nombre: "Pieza", abreviacion: "pza", es_global: true },
];

/** Colección con el envelope ya desenvuelto (regla de oro #1). */
function coleccion<T>(data: T[] = []) {
  return {
    data,
    meta: { current_page: 1, per_page: 100, total: data.length, last_page: 1 },
    links: { first: null, last: null, prev: null, next: null },
  };
}

function montar(
  opciones: {
    producto?: ProductoRecurso;
    permisos?: string[];
    unidades?: UnidadRecurso[];
    /** Catálogo contra el que se busca el nombre repetido (`GET /productos?buscar=`). */
    catalogo?: ProductoRecurso[];
  } = {},
) {
  const onOpenChange = vi.fn();
  // Sin responder /unidades-medida el atajo no se ofrece y los tests pasarían por la
  // razón equivocada: hay que devolver las unidades como lo hace el backend.
  getMock.mockImplementation((url: string, config?: { params?: Record<string, unknown> }) => {
    if (url === "/unidades-medida") return Promise.resolve(coleccion(opciones.unidades ?? UNIDADES));
    if (url === "/productos") {
      // El backend filtra por nombre; el mock hace lo mismo para que el aviso dependa
      // de lo que realmente devolvería la búsqueda.
      const termino = String(config?.params?.buscar ?? "").toLowerCase();
      const lista = (opciones.catalogo ?? []).filter((p) =>
        p.nombre.toLowerCase().includes(termino),
      );
      return Promise.resolve(coleccion(lista));
    }
    return Promise.resolve(coleccion([]));
  });
  renderConProviders(
    <ProductoFormDialog
      open
      onOpenChange={onOpenChange}
      producto={opciones.producto}
      categorias={CATEGORIAS}
    />,
    { permisos: opciones.permisos ?? ["productos.gestionar", "categorias.gestionar"] },
  );
  return { user: userEvent.setup(), onOpenChange };
}

afterEach(() => {
  getMock.mockReset();
  postMock.mockReset();
  putMock.mockReset();
  limpiarSesion();
});

describe("ProductoFormDialog · camino corto", () => {
  it("el alta solo muestra nombre, categoría y precio; lo demás está plegado", async () => {
    montar();

    expect(screen.getByLabelText(/nombre/i)).toBeVisible();
    expect(screen.getByLabelText(/precio de venta/i)).toBeVisible();

    // Siguen en el DOM (el plegado no desmonta), pero no a la vista.
    expect(screen.getByLabelText(/código o sku/i)).not.toBeVisible();
    expect(screen.getByLabelText(/descripción/i)).not.toBeVisible();
    expect(screen.getByLabelText(/descuenta insumos al venderse/i)).not.toBeVisible();
  });

  it("'Más opciones' despliega lo avanzado", async () => {
    const { user } = montar();

    await user.click(screen.getByRole("button", { name: /más opciones/i }));

    expect(screen.getByLabelText(/código o sku/i)).toBeVisible();
    expect(screen.getByLabelText(/descuenta insumos al venderse/i)).toBeVisible();
  });

  it("al editar un producto con datos avanzados la sección se abre sola", async () => {
    montar({ producto: PRODUCTO_CON_INVENTARIO });

    // Esconder lo que se vino a editar obligaría a buscarlo a ciegas.
    expect(screen.getByLabelText(/descuenta insumos al venderse/i)).toBeVisible();
  });
});

describe("ProductoFormDialog · alta encadenada", () => {
  it("'Guardar y crear otro' conserva la categoría, limpia el nombre y no cierra", async () => {
    const { user, onOpenChange } = montar();
    postMock.mockResolvedValue({ ...PRODUCTO_CON_INVENTARIO, id: 99 });

    await user.type(screen.getByLabelText(/nombre/i), "Corona 355ml");
    await user.click(screen.getByRole("combobox", { name: /categoría/i }));
    await user.click(await screen.findByRole("option", { name: "Cervezas" }));
    await user.type(screen.getByLabelText(/precio de venta/i), "45");

    await user.click(screen.getByRole("button", { name: /guardar y crear otro/i }));

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith("/productos", {
        nombre: "Corona 355ml",
        id_categoria: 1,
        precio_venta: 45,
        controla_inventario: false,
      }),
    );

    // El diálogo sigue abierto y listo para el siguiente renglón del menú.
    expect(onOpenChange).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByLabelText(/nombre/i)).toHaveValue(""));
    expect(screen.getByRole("combobox", { name: /categoría/i })).toHaveTextContent("Cervezas");
  });
});

describe("ProductoFormDialog · categoría sin salir del formulario", () => {
  it("crea la categoría al final de la lista y la deja seleccionada", async () => {
    const { user } = montar();
    postMock.mockResolvedValue({ id: 30, nombre: "Sin alcohol", orden_display: 3, activo: true });

    await user.click(screen.getByRole("button", { name: /nueva categoría/i }));
    await user.type(screen.getByLabelText(/nombre de la nueva categoría/i), "Sin alcohol");
    await user.click(screen.getByRole("button", { name: /^crear$/i }));

    // La posición no se pregunta: 1 y 2 están ocupadas, así que la nueva es la 3.
    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith("/categorias", {
        nombre: "Sin alcohol",
        orden_display: 3,
      }),
    );
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: /categoría/i })).toHaveTextContent(
        "Sin alcohol",
      ),
    );
  });
});

describe("ProductoFormDialog · costo e inventario dicen la verdad", () => {
  it("con inventario encendido y receta por armar, no pide costo: sale de la receta", async () => {
    const { user } = montar();

    await user.click(screen.getByRole("button", { name: /más opciones/i }));
    expect(screen.getByLabelText(/cuánto te cuesta cada uno/i)).toBeVisible();

    await user.click(screen.getByLabelText(/descuenta insumos al venderse/i));
    // Apagando el atajo, el costo saldrá de los insumos que se pongan en la receta.
    await user.click(await screen.findByLabelText(/sale del almacén tal cual/i));

    // El reporte de margen ignora costo_referencia cuando hay receta (MargenQuery).
    expect(screen.queryByLabelText(/cuánto te cuesta cada uno/i)).toBeNull();
    expect(screen.getByText(/el costo se calcula solo/i)).toBeInTheDocument();
  });

  it("avisa cuando el inventario está encendido pero el producto no tiene receta", async () => {
    montar({
      producto: PRODUCTO_CON_INVENTARIO,
      permisos: ["productos.gestionar", "recetas.gestionar"],
    });

    const aviso = await screen.findByText(/todavía no descuenta nada/i);
    expect(aviso).toBeInTheDocument();
    await waitFor(() =>
      expect(getMock).toHaveBeenCalledWith("/recetas", {
        params: { id_producto: 7, per_page: 1 },
      }),
    );
  });
});

describe("ProductoFormDialog · atajo \"sale del almacén\"", () => {
  /** Deja el formulario listo para guardar, con el inventario encendido. */
  async function conInventario(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/^nombre$/i), "Corona 355ml");
    await user.click(screen.getByRole("combobox", { name: /categoría/i }));
    await user.click(await screen.findByRole("option", { name: "Cervezas" }));
    await user.type(screen.getByLabelText(/precio de venta/i), "45");
    await user.click(screen.getByRole("button", { name: /más opciones/i }));
    await user.click(screen.getByLabelText(/descuenta insumos al venderse/i));
  }

  it("crea el insumo y la receta en la misma alta, con la unidad Pieza", async () => {
    postMock.mockResolvedValue({ id: 1 });
    const { user } = montar();

    await conInventario(user);
    // El atajo viene propuesto: es el caso común en una cantina.
    expect(await screen.findByLabelText(/sale del almacén tal cual/i)).toBeChecked();
    await user.type(screen.getByLabelText(/cuánto te cuesta cada uno/i), "22");
    await user.click(screen.getByRole("button", { name: /^guardar$/i }));

    await waitFor(() => expect(postMock).toHaveBeenCalled());
    const [url, payload] = postMock.mock.calls[0];
    expect(url).toBe("/productos");
    // El costo va al insumo, que es de donde MargenQuery lo lee con inventario
    // encendido; mandarlo además como costo_referencia sería guardarlo donde se ignora.
    expect(payload.insumo).toEqual({ id_unidad_medida: 5, costo_unitario: 22 });
    expect(payload.costo_referencia).toBeUndefined();
    expect(payload.controla_inventario).toBe(true);
  });

  it("apagando el atajo no crea nada de almacén", async () => {
    postMock.mockResolvedValue({ id: 1 });
    const { user } = montar();

    await conInventario(user);
    await user.click(await screen.findByLabelText(/sale del almacén tal cual/i));
    await user.click(screen.getByRole("button", { name: /^guardar$/i }));

    await waitFor(() => expect(postMock).toHaveBeenCalled());
    expect(postMock.mock.calls[0][1].insumo).toBeUndefined();
  });

  it("dice lo que va a crear antes de crearlo", async () => {
    const { user } = montar();

    await conInventario(user);

    // Crear cosas de lado sin avisar es peor que pedir un clic de más.
    expect(await screen.findByText(/se creará también su insumo en el almacén/i)).toBeInTheDocument();
    expect(screen.getByText(/se reutiliza y no se duplica el stock/i)).toBeInTheDocument();
  });

  it("no ofrece el atajo al editar: el backend no lo reabre", async () => {
    montar({ producto: PRODUCTO_CON_INVENTARIO });

    expect(await screen.findByLabelText(/descuenta insumos al venderse/i)).toBeChecked();
    expect(screen.queryByLabelText(/sale del almacén tal cual/i)).toBeNull();
  });

  it("esconde el atajo si no hay ninguna unidad, en vez de fallar al guardar", async () => {
    const { user } = montar({ unidades: [] });

    await conInventario(user);

    expect(screen.queryByLabelText(/sale del almacén tal cual/i)).toBeNull();
    expect(screen.getByText(/el costo se calcula solo/i)).toBeInTheDocument();
  });
});

/**
 * Aviso de nombre repetido (2026-09-11). El catálogo no exige nombre único a propósito,
 * pero sin variantes en el modelo duplicar el nombre es la única forma de tener dos
 * precios — y el resultado son productos que el mesero no distingue. Se avisa con el
 * dato que permite decidir, y **no se bloquea**.
 */
describe("ProductoFormDialog · nombre repetido", () => {
  it("avisa con la categoría y el precio del que ya existe", async () => {
    const { user } = montar({ catalogo: [PRODUCTO_CON_INVENTARIO] });

    await user.type(screen.getByLabelText(/nombre/i), "Michelada");

    // El aviso lleva los dos datos que permiten decidir: dónde está y a qué precio.
    const aviso = await screen.findByRole("status");
    expect(aviso).toHaveTextContent(/ya existe/i);
    expect(aviso).toHaveTextContent(/Cervezas/);
    expect(aviso).toHaveTextContent(/\$60\.00/);
  });

  it("no bloquea el guardado: es advertencia, no error", async () => {
    postMock.mockResolvedValue({ id: 9 });
    const { user } = montar({ catalogo: [PRODUCTO_CON_INVENTARIO] });

    await user.type(screen.getByLabelText(/nombre/i), "Michelada");
    await screen.findByText(/ya existe/i);
    await user.click(screen.getByLabelText(/categoría/i));
    await user.click(await screen.findByRole("option", { name: "Cervezas" }));
    await user.type(screen.getByLabelText(/precio/i), "60");
    await user.click(screen.getByRole("button", { name: /^guardar$/i }));

    await waitFor(() => expect(postMock).toHaveBeenCalled());
  });

  it("un nombre que solo se parece no dispara el aviso", async () => {
    const { user } = montar({ catalogo: [PRODUCTO_CON_INVENTARIO] });

    // "Michelada cubana" contiene a "Michelada", pero no es el mismo producto.
    await user.type(screen.getByLabelText(/nombre/i), "Michelada cubana");

    await waitFor(() =>
      expect(getMock).toHaveBeenCalledWith("/productos", expect.anything()),
    );
    expect(screen.queryByText(/ya existe/i)).not.toBeInTheDocument();
  });

  it("al editar, el producto no se avisa a sí mismo", async () => {
    montar({ producto: PRODUCTO_CON_INVENTARIO, catalogo: [PRODUCTO_CON_INVENTARIO] });

    await waitFor(() =>
      expect(getMock).toHaveBeenCalledWith("/productos", expect.anything()),
    );
    expect(screen.queryByText(/ya existe/i)).not.toBeInTheDocument();
  });
});
