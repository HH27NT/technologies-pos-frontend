import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { limpiarSesion, renderConProviders } from "@/test/utils";
import { ReportesPage } from "./ReportesPage";
import type { ReporteData } from "../types";

/**
 * Reportes (M16), fase B: `tipo` y `preset` viven en la URL para que el dashboard
 * pueda enlazar a un reporte ya filtrado ("Ver todo"). Lo que se protege aquí es esa
 * traducción URL → petición —qué reporte y qué rango se le piden al backend—, que es
 * lo único que el usuario nota al seguir el enlace. Por eso se afirma sobre la llamada
 * del cliente, no sobre lo que se pinta.
 */

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock("@/lib/api/client", () => ({
  client: { get: getMock, post: vi.fn() },
}));

/** Reporte vacío: sin filas no se dibuja la gráfica, y Recharts no mide nada en jsdom. */
const VACIO: ReporteData = {
  reporte: "dashboard",
  titulo: "Dashboard",
  rango: {
    zona_horaria: "America/Mexico_City",
    preset: "hoy",
    inicio: "2026-09-01T06:00:00+00:00",
    fin: "2026-09-02T06:00:00+00:00",
    inicio_local: "2026-09-01",
    fin_local: "2026-09-01",
    etiqueta: "1 de septiembre de 2026",
    preset_etiqueta: "Hoy",
  },
  columnas: [],
  filas: [],
  resumen: {},
};

function montar(url: string, permisos: string[] = ["reportes.ver"]) {
  getMock.mockResolvedValue(VACIO);
  renderConProviders(
    <MemoryRouter initialEntries={[url]}>
      <ReportesPage />
    </MemoryRouter>,
    { permisos },
  );
  return userEvent.setup();
}

/** Lo que el cliente pidió en la última llamada: [url, { params }]. */
const ultimaPeticion = () => getMock.mock.calls.at(-1);

afterEach(() => {
  getMock.mockReset();
  limpiarSesion();
});

describe("ReportesPage · tipo y preset en la URL", () => {
  it("pide el reporte y el rango que trae la URL", async () => {
    montar("/app/reportes?tipo=margen&preset=mes");

    await waitFor(() =>
      expect(ultimaPeticion()).toEqual(["/reportes/margen", { params: { preset: "mes" } }]),
    );
    expect(screen.getByRole("tab", { name: "Margen" })).toHaveAttribute("aria-selected", "true");
  });

  // La URL es la única entrada no confiable de esta pantalla: cualquiera la edita, y un
  // preset fuera del catálogo es un 422 del backend ("El periodo debe ser…").
  it("un preset inventado no llega al backend", async () => {
    montar("/app/reportes?tipo=ventas&preset=trimestre");

    await waitFor(() =>
      expect(ultimaPeticion()).toEqual(["/reportes/ventas", { params: { preset: "hoy" } }]),
    );
  });

  // Capa de permiso (regla #3): sin el fallback a `disponibles[0]`, el operador vería
  // una pestaña que le responde 403.
  it("el operador que llega a un reporte admin-only cae al dashboard", async () => {
    montar("/app/reportes?tipo=margen&preset=mes", ["reportes.ver_limitado"]);

    await waitFor(() =>
      expect(ultimaPeticion()).toEqual(["/reportes/dashboard", { params: { preset: "mes" } }]),
    );
    expect(screen.queryByRole("tab", { name: "Margen" })).not.toBeInTheDocument();
  });

  // El más valioso pese a parecer trivial: prueba que `setParam` FUSIONA los parámetros.
  // Si alguien lo cambiara por `new URLSearchParams({ preset })`, el `tipo` se perdería
  // y tocar un rango te devolvería al dashboard.
  it("cambiar el rango conserva el reporte", async () => {
    const user = montar("/app/reportes?tipo=ventas&preset=hoy");
    await waitFor(() => expect(getMock).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: "Año" }));

    await waitFor(() =>
      expect(ultimaPeticion()).toEqual(["/reportes/ventas", { params: { preset: "año" } }]),
    );
  });
});
