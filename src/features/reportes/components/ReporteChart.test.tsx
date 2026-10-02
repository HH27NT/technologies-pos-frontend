import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ReporteChart } from "./ReporteChart";
import type { FilaReporte } from "../types";

/**
 * Gráfica genérica de reporte. Lo que se protege es que un valor **desconocido** no
 * se dibuje como una barra de cero: desde el 2026-09-12 el margen llega nulo cuando
 * el costo del producto no está capturado, y a ras del eje se leía como "este
 * producto no deja utilidad".
 */

const CHART = { x: "producto", y: "margen" };
const props = { chart: CHART, etiquetaValor: "Margen", formatoValor: (v: number) => String(v) };

describe("ReporteChart", () => {
  it("no dibuja nada cuando ningún valor se conoce", () => {
    const filas: FilaReporte[] = [
      { producto: "Michelada", margen: null },
      { producto: "Corona 355ml", margen: null },
    ];

    const { container } = render(<ReporteChart filas={filas} {...props} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("dibuja los valores que sí se conocen", () => {
    const filas: FilaReporte[] = [
      { producto: "Michelada", margen: null },
      { producto: "Corona 355ml", margen: 70 },
    ];

    const { container } = render(<ReporteChart filas={filas} {...props} />);

    expect(container).not.toBeEmptyDOMElement();
  });
});
