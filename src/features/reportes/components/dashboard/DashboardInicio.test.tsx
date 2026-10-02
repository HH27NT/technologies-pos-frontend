import { afterEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { limpiarSesion, renderConProviders } from "@/test/utils";
import { DashboardInicio } from "./DashboardInicio";
import type { FilaReporte, ReporteData, ResumenReporte } from "../../types";

/**
 * Dashboard (M16). Lo que se protege aquí es el KPI de margen: un costo que nadie
 * capturó no vale cero, así que el porcentaje de utilidad **no se publica** cuando
 * hay productos sin costo. El síntoma que lo originó era un "100.0% de utilidad"
 * calculado sobre insumos sin `costo_unitario`.
 */

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock("@/lib/api/client", () => ({
  client: { get: getMock, post: vi.fn() },
}));

const RANGO = {
  zona_horaria: "America/Mexico_City",
  preset: "mes",
  inicio: "2026-09-01T06:00:00+00:00",
  fin: "2026-10-01T06:00:00+00:00",
  inicio_local: "2026-09-01",
  fin_local: "2026-09-30",
  etiqueta: "septiembre de 2026",
  preset_etiqueta: "Este mes",
};

/** Reporte sin filas: así ninguna gráfica se dibuja (Recharts no mide en jsdom). */
function reporte(resumen: ResumenReporte = {}, filas: FilaReporte[] = []): ReporteData {
  return { reporte: "x", titulo: "x", rango: RANGO, columnas: [], filas, resumen };
}

function montar(resumenMargen: ResumenReporte, filasMargen: FilaReporte[] = []) {
  getMock.mockImplementation((url: string) =>
    Promise.resolve(url.includes("margen") ? reporte(resumenMargen, filasMargen) : reporte()),
  );
  renderConProviders(
    <MemoryRouter>
      <DashboardInicio />
    </MemoryRouter>,
    { permisos: ["reportes.ver"] },
  );
}

afterEach(() => {
  limpiarSesion();
  getMock.mockReset();
});

describe("DashboardInicio · KPI de margen", () => {
  it("dice cuántos productos no tienen costo en vez de publicar el porcentaje", async () => {
    montar({ ingreso: 200, costo: 30, margen: 170, margen_pct: null, productos_sin_costo: 2 });

    expect(
      await screen.findByText("2 productos sin costo capturado: la utilidad sale alta"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/% de utilidad/)).not.toBeInTheDocument();
  });

  /**
   * El caso que destapó el navegador el 2026-09-12: con 12 de 12 productos sin costo,
   * el tile decía "$1,238.50" —el ingreso entero— con la utilidad como titular.
   */
  it("no pinta cifra cuando no se conoce el costo de ningún producto", async () => {
    montar({ ingreso: 1238.5, costo: null, margen: null, margen_pct: null, productos_sin_costo: 12 });

    expect(
      await screen.findByText("12 productos sin costo capturado: no hay con qué calcular la utilidad"),
    ).toBeInTheDocument();
    expect(screen.queryByText("$1,238.50")).not.toBeInTheDocument();
  });

  it("usa el singular con un solo producto sin costo", async () => {
    montar({ ingreso: 100, costo: 30, margen: 70, margen_pct: null, productos_sin_costo: 1 });

    expect(
      await screen.findByText("1 producto sin costo capturado: la utilidad sale alta"),
    ).toBeInTheDocument();
  });

  it("publica el porcentaje cuando el costo está completo", async () => {
    montar({ ingreso: 200, costo: 75, margen: 125, margen_pct: 62.5, productos_sin_costo: 0 });

    expect(await screen.findByText("62.5% de utilidad")).toBeInTheDocument();
  });

  /**
   * La tarjeta "Productos más rentables" se quedaba en blanco: tenía filas, así que
   * no se consideraba vacía, pero ninguna podía dibujarse.
   */
  it("explica la tarjeta de rentables cuando ningún producto tiene costo", async () => {
    montar({ ingreso: 100, costo: null, margen: null, margen_pct: null, productos_sin_costo: 2 }, [
      { producto: "Michelada", cantidad: 3, ingreso: 180, costo: null, margen: null },
      { producto: "Corona 355ml", cantidad: 1, ingreso: 50, costo: null, margen: null },
    ]);

    expect(
      await screen.findByText("Ningún producto vendido tiene costo capturado."),
    ).toBeInTheDocument();
  });
});