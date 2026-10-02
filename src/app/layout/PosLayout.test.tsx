import { afterEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useAuthStore } from "@/lib/auth";
import { limpiarSesion, renderConProviders } from "@/test/utils";
import { PosLayout } from "./PosLayout";

// PosLayout monta useSincronizarCajaAbierta → GET /caja/actual. Sin caja abierta (null),
// así la compuerta queda "cerrada", coherente con lo que afirman los casos.
const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));
vi.mock("@/lib/api/client", () => ({
  client: { get: getMock, post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}));

/**
 * Header del POS. Afordances gateadas por permiso (regla #3), porque el POS lo comparten
 * roles muy distintos. Lo que se protege aquí son tres bugs reportados en el rol mesero:
 *  - "Administración" (→ /app) solo con `reportes.ver`; sin él AppHome rebota a /pos (loop);
 *  - la badge "Caja cerrada" enlaza a abrir caja solo con `caja.abrir`;
 *  - "Cerrar sesión" existe siempre (antes el mesero no tenía salida desde el POS).
 */

function montar(permisos: string[]) {
  getMock.mockResolvedValue(null); // /caja/actual → sin caja abierta
  // La compuerta de caja no la fija renderConProviders: la fijamos explícita.
  useAuthStore.setState({ cajaAbierta: false });
  return renderConProviders(
    <MemoryRouter>
      <PosLayout />
    </MemoryRouter>,
    { permisos },
  );
}

afterEach(() => {
  getMock.mockReset();
  limpiarSesion();
});

describe("PosLayout · afordances por permiso", () => {
  it("mesero (sin reportes.ver ni caja.abrir): sin Administración, badge sin link, con cerrar sesión", () => {
    montar([]);

    expect(screen.queryByRole("link", { name: /administración/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cerrar sesión/i })).toBeInTheDocument();
    // La badge es informativa: no debe llevar a una ruta sin acceso.
    expect(screen.getByText("Caja cerrada").closest("a")).toBeNull();
  });

  it("admin (reportes.ver + caja.abrir): con Administración, badge enlazada y cerrar sesión", () => {
    montar(["reportes.ver", "caja.abrir"]);

    expect(screen.getByRole("link", { name: /administración/i })).toHaveAttribute("href", "/app");
    expect(screen.getByRole("button", { name: /cerrar sesión/i })).toBeInTheDocument();
    // Quien puede abrir caja sí navega a hacerlo desde la badge.
    expect(screen.getByText("Caja cerrada").closest("a")).toHaveAttribute("href", "/app/caja");
  });
});
