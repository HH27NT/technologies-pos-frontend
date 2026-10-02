import { describe, expect, it } from "vitest";
import { unidadPorDefecto } from "./unidadPorDefecto";
import type { UnidadRecurso } from "./types";

function unidad(id: number, nombre: string, es_global = true): UnidadRecurso {
  return { id, nombre, abreviacion: null, es_global };
}

describe("unidadPorDefecto", () => {
  it("elige Pieza cuando está entre las globales", () => {
    const elegida = unidadPorDefecto([unidad(1, "Litro"), unidad(2, "Pieza"), unidad(3, "Caja")]);

    expect(elegida?.nombre).toBe("Pieza");
  });

  it("no se deja engañar por mayúsculas ni espacios", () => {
    expect(unidadPorDefecto([unidad(1, "  PIEZA ")])?.id).toBe(1);
  });

  it("ignora una 'Pieza' propia del establecimiento y prefiere la global", () => {
    // La global es la sembrada y la que existe en todos los tenants; una homónima
    // creada a mano puede significar cualquier otra cosa.
    const elegida = unidadPorDefecto([unidad(9, "Pieza", false), unidad(2, "Pieza")]);

    expect(elegida?.id).toBe(2);
  });

  it("cae en cualquier global si no hay Pieza", () => {
    expect(unidadPorDefecto([unidad(7, "Propia", false), unidad(3, "Litro")])?.id).toBe(3);
  });

  it("como último recurso devuelve la primera que haya", () => {
    expect(unidadPorDefecto([unidad(7, "Propia", false)])?.id).toBe(7);
  });

  it("devuelve undefined sin unidades, para que la interfaz esconda el atajo", () => {
    expect(unidadPorDefecto([])).toBeUndefined();
  });
});
