import { describe, expect, it } from "vitest";
import { esRolAdmin, etiquetaRol, nombreDeRol } from "./etiquetas";

describe("etiquetaRol", () => {
  it("traduce los roles conocidos a español, sentence case", () => {
    expect(etiquetaRol("admin")).toBe("Administrador");
    expect(etiquetaRol("gerente")).toBe("Gerente");
    expect(etiquetaRol("operador")).toBe("Operador");
    expect(etiquetaRol("mesero")).toBe("Mesero");
    expect(etiquetaRol("super_admin")).toBe("Super administrador");
  });

  it("devuelve el nombre tal cual si es desconocido", () => {
    expect(etiquetaRol("otro_rol")).toBe("otro_rol");
    expect(etiquetaRol("—")).toBe("—");
  });
});

describe("nombreDeRol", () => {
  it("usa la etiqueta propia de un rol a medida", () => {
    expect(nombreDeRol({ name: "cajero_nocturno", etiqueta: "Cajero nocturno" })).toBe(
      "Cajero nocturno",
    );
  });

  it("traduce el preset cuando no hay etiqueta", () => {
    expect(nombreDeRol({ name: "mesero", etiqueta: null })).toBe("Mesero");
  });
});

describe("esRolAdmin", () => {
  it("reconoce admin y super_admin", () => {
    expect(esRolAdmin("admin")).toBe(true);
    expect(esRolAdmin("super_admin")).toBe(true);
  });

  it("no marca a los roles no-admin (salvaguarda anti-escalada)", () => {
    expect(esRolAdmin("gerente")).toBe(false);
    expect(esRolAdmin("operador")).toBe(false);
    expect(esRolAdmin("mesero")).toBe(false);
  });
});
