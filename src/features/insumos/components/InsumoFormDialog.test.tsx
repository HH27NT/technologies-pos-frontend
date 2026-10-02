import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { limpiarSesion, renderConProviders } from "@/test/utils";
import { InsumoFormDialog } from "./InsumoFormDialog";
import type { InsumoRecurso } from "../types";
import type { UnidadRecurso } from "@/features/unidades";
import type { ProveedorRecurso } from "@/features/proveedores";

/**
 * Clase del insumo (2026-09-07): `controlado` se descuenta por receta al vender;
 * `consumo` no se descuenta y se cuadra contando. Nace de un problema real de barra:
 * nadie sabe si en un preparado van 4 g de tamarindo o 10, y una cantidad inventada
 * en la receta desvía el inventario de todo lo demás.
 */

const { postMock, putMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  putMock: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  client: { get: vi.fn(), post: postMock, put: putMock, patch: vi.fn() },
}));

const UNIDADES: UnidadRecurso[] = [
  { id: 3, nombre: "Gramo", abreviacion: "g", es_global: true },
  { id: 5, nombre: "Pieza", abreviacion: "pza", es_global: true },
];

const PROVEEDORES: ProveedorRecurso[] = [];

function montar(insumo?: InsumoRecurso) {
  const onOpenChange = vi.fn();
  renderConProviders(
    <InsumoFormDialog
      open
      onOpenChange={onOpenChange}
      insumo={insumo}
      unidades={UNIDADES}
      proveedores={PROVEEDORES}
    />,
    { permisos: ["insumos.gestionar"] },
  );
  return { user: userEvent.setup(), onOpenChange };
}

async function elegir(user: ReturnType<typeof userEvent.setup>, campo: RegExp, opcion: RegExp) {
  await user.click(screen.getByRole("combobox", { name: campo }));
  await user.click(await screen.findByRole("option", { name: opcion }));
}

afterEach(() => {
  postMock.mockReset();
  putMock.mockReset();
  limpiarSesion();
});

describe("InsumoFormDialog · cómo se descuenta", () => {
  it("el alta arranca en controlado: el tanteo es la excepción", () => {
    montar();

    expect(screen.getByRole("combobox", { name: /cómo se descuenta/i })).toHaveTextContent(
      /por receta, al vender/i,
    );
    expect(screen.getByText(/cada venta descuenta lo que diga la receta/i)).toBeVisible();
  });

  it("al elegir conteo físico avisa que no podrá usarse en recetas", async () => {
    const { user } = montar();

    await elegir(user, /cómo se descuenta/i, /por conteo físico/i);

    expect(screen.getByText(/no podrá usarse en recetas/i)).toBeVisible();
  });

  it("manda el tipo al backend", async () => {
    postMock.mockResolvedValue({ id: 1 });
    const { user } = montar();

    await user.type(screen.getByLabelText(/nombre/i), "Tamarindo");
    await elegir(user, /unidad de medida/i, /gramo/i);
    await elegir(user, /cómo se descuenta/i, /por conteo físico/i);
    await user.click(screen.getByRole("button", { name: /^guardar$/i }));

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith(
        "/insumos",
        expect.objectContaining({ nombre: "Tamarindo", tipo: "consumo" }),
      ),
    );
  });
});

describe("InsumoFormDialog · existencia inicial", () => {
  it("ofrece capturar la existencia al crear y la manda como stock_inicial", async () => {
    postMock.mockResolvedValue({ id: 1 });
    const { user } = montar();

    await user.type(screen.getByLabelText(/nombre/i), "Ron blanco");
    await elegir(user, /unidad de medida/i, /pieza/i);
    await user.type(screen.getByLabelText(/existencia inicial/i), "12");
    await user.click(screen.getByRole("button", { name: /^guardar$/i }));

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith(
        "/insumos",
        expect.objectContaining({ stock_inicial: 12 }),
      ),
    );
  });

  it("no ofrece existencia inicial ni la manda al editar", () => {
    const insumo: InsumoRecurso = {
      id: 9,
      nombre: "Ron blanco",
      tipo: "controlado",
      id_unidad_medida: 5,
      id_proveedor: null,
      stock_actual: "3.000",
      stock_minimo: "0.000",
      costo_unitario: null,
      activo: true,
      stock_bajo: false,
      unidad_medida: UNIDADES[1],
      proveedor: null,
    };
    montar(insumo);

    expect(screen.queryByLabelText(/existencia inicial/i)).not.toBeInTheDocument();
  });
});
