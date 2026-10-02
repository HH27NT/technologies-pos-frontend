import { afterEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { limpiarSesion, renderConProviders } from "@/test/utils";
import { PosPage } from "./PosPage";
import type { Orden } from "../types";

/**
 * Landing del POS (M11). Lo que se protege aquí es la ATRIBUCIÓN del mesero (fase 1):
 *  - el default del filtro se decide POR PERMISO, no por rol (regla #3): quien no opera
 *    caja (mesero) arranca en "mis órdenes"; el cajero/admin (caja.abrir) ve todas;
 *  - "Atendió: X" solo aparece al ver "todas" (no repetir tu propio nombre por tarjeta).
 * La sesión simulada es el usuario id=1 (ver renderConProviders).
 */

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock("@/lib/api/client", () => ({
  client: { get: getMock, post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}));

function orden(id: number, folio: string, idUsuario: number, nombre: string): Orden {
  return {
    id,
    folio,
    estado: "abierta",
    id_mesa: null,
    id_tipo_orden: 2,
    id_sesion_caja: 1,
    id_usuario: idUsuario,
    descuento: "0.00",
    subtotal: "100.00",
    impuesto: "0.00",
    total: "100.00",
    notas: null,
    abierta_at: "2026-08-05T18:00:00Z",
    cerrada_at: null,
    mesa: null,
    usuario: { id: idUsuario, nombre },
  };
}

/** Dos órdenes abiertas: una del usuario en sesión (id=1) y otra de Ana (id=2). */
const ORDENES: Orden[] = [
  orden(1, "000001", 1, "Operador de prueba"),
  orden(2, "000002", 2, "Ana"),
];

function montar(permisos: string[]) {
  getMock.mockImplementation((url: string) =>
    url === "/ordenes"
      ? Promise.resolve({ data: ORDENES })
      : Promise.resolve({ data: [] }),
  );
  renderConProviders(
    <MemoryRouter>
      <PosPage />
    </MemoryRouter>,
    { permisos },
  );
  return userEvent.setup();
}

afterEach(() => {
  getMock.mockReset();
  limpiarSesion();
});

describe("PosPage · atribución del mesero", () => {
  it("el cajero (caja.abrir) ve todas por defecto y quién atendió cada orden", async () => {
    montar(["ordenes.crear", "caja.abrir"]);

    expect(await screen.findByText("000001")).toBeInTheDocument();
    expect(screen.getByText("000002")).toBeInTheDocument();
    expect(screen.getByText(/Atendió: Ana/)).toBeInTheDocument();
  });

  it("el mesero (sin caja.abrir) arranca en 'mis órdenes' y puede ver todas", async () => {
    const user = montar(["ordenes.crear"]);

    // Default = solo mías: se ve la del usuario 1, no la de Ana, y sin "Atendió:".
    expect(await screen.findByText("000001")).toBeInTheDocument();
    expect(screen.queryByText("000002")).not.toBeInTheDocument();
    expect(screen.queryByText(/Atendió:/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /todas/i }));

    // Al ver todas, aparece la orden de Ana y su atribución.
    expect(await screen.findByText("000002")).toBeInTheDocument();
    expect(screen.getByText(/Atendió: Ana/)).toBeInTheDocument();
  });
});
