import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { limpiarSesion, renderConProviders } from "@/test/utils";
import { useReasignarOrden } from "../api";
import { ReasignarDialog } from "./ReasignarDialog";
import type { Orden } from "../types";

/**
 * Traspaso de mesero (fase 1b). Se protege el contrato del hook (PATCH correcto) y que el
 * diálogo muestre el mesero actual y no permita "reasignar" sin cambio real (evita ruido/no-op).
 */

const { getMock, patchMock } = vi.hoisted(() => ({ getMock: vi.fn(), patchMock: vi.fn() }));
vi.mock("@/lib/api/client", () => ({
  client: { get: getMock, patch: patchMock, post: vi.fn(), put: vi.fn() },
}));

const ORDEN: Orden = {
  id: 5,
  folio: "000005",
  estado: "abierta",
  id_mesa: null,
  id_tipo_orden: 2,
  id_sesion_caja: 1,
  id_usuario: 1,
  descuento: "0.00",
  subtotal: "100.00",
  impuesto: "0.00",
  total: "100.00",
  notas: null,
  abierta_at: "2026-08-06T18:00:00Z",
  cerrada_at: null,
  mesa: null,
  usuario: { id: 1, nombre: "Ana" },
};

/** Sonda para ejercitar el hook sin UI. */
function Probe() {
  const m = useReasignarOrden();
  return (
    <button onClick={() => m.mutate({ idOrden: 5, idUsuario: 9 })}>go</button>
  );
}

afterEach(() => {
  getMock.mockReset();
  patchMock.mockReset();
  limpiarSesion();
});

describe("Reasignar (fase 1b)", () => {
  it("el hook hace PATCH /ordenes/{id}/reasignar con id_usuario", async () => {
    patchMock.mockResolvedValue({ ...ORDEN, id_usuario: 9, usuario: { id: 9, nombre: "Beto" } });
    const user = userEvent.setup();
    renderConProviders(<Probe />);

    await user.click(screen.getByRole("button", { name: "go" }));

    await waitFor(() =>
      expect(patchMock).toHaveBeenCalledWith("/ordenes/5/reasignar", { id_usuario: 9 }),
    );
  });

  it("muestra el mesero actual y desactiva 'Reasignar' hasta que cambie", async () => {
    getMock.mockResolvedValue({
      data: [
        { id: 1, nombre: "Ana", activo: true },
        { id: 9, nombre: "Beto", activo: true },
      ],
    });

    renderConProviders(
      <ReasignarDialog open onOpenChange={() => {}} orden={ORDEN} />,
      { permisos: ["ordenes.reasignar"] },
    );

    expect(await screen.findByText(/la atiende Ana/i)).toBeInTheDocument();
    // Arranca en el mesero actual → sin cambio → botón deshabilitado.
    expect(screen.getByRole("button", { name: /^Reasignar$/i })).toBeDisabled();
  });
});
