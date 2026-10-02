import { afterEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { useAuthStore } from "@/lib/auth";
import { limpiarSesion, renderConProviders } from "@/test/utils";
import { useSincronizarCajaAbierta } from "./api";

/**
 * P1 (freshness de caja): la compuerta del POS debe reflejar el estado real de caja
 * sin recargar. `useSincronizarCajaAbierta` empuja a `cajaAbierta` del authStore lo que
 * responde GET /caja/actual (presencia = abierta), para que el mesero se entere cuando
 * el cajero abre/cierra caja en otra terminal.
 */

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ client: { get: getMock } }));

/** Sonda: solo ejecuta el hook; no pinta nada. */
function Sonda() {
  useSincronizarCajaAbierta();
  return null;
}

afterEach(() => {
  getMock.mockReset();
  limpiarSesion();
});

describe("useSincronizarCajaAbierta", () => {
  it("marca cajaAbierta=true cuando /caja/actual devuelve una sesión", async () => {
    getMock.mockResolvedValue({ id: 7, estado: "abierta", abierta_at: "2026-08-05T18:00:00Z" });
    useAuthStore.setState({ cajaAbierta: false });

    renderConProviders(<Sonda />);

    await waitFor(() => expect(useAuthStore.getState().cajaAbierta).toBe(true));
  });

  it("marca cajaAbierta=false cuando /caja/actual devuelve null", async () => {
    getMock.mockResolvedValue(null);
    useAuthStore.setState({ cajaAbierta: true });

    renderConProviders(<Sonda />);

    await waitFor(() => expect(useAuthStore.getState().cajaAbierta).toBe(false));
  });
});
