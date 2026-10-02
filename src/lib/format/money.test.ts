import { describe, expect, it } from "vitest";
import { formatDecimal, formatMoney, toNumber } from "./money";

/**
 * Regla de oro #6: los importes llegan CONGELADOS del backend y aquí solo se
 * muestran. Estas pruebas cubren el punto exacto donde eso puede romperse: el
 * backend manda los decimales como STRING, y convertirlos mal es la forma
 * silenciosa de mostrarle al cajero un total distinto al que se está cobrando.
 */

/**
 * Intl inserta espacios duros (U+00A0) o finos (U+202F) segun el locale y la version
 * de ICU. Se normalizan a un espacio normal para que las comparaciones no dependan
 * del entorno donde corra la suite.
 */
function normalizar(texto: string): string {
  return texto.replace(/[\u00A0\u202F]/g, " ");
}

describe("toNumber", () => {
  it("convierte los decimales en string que manda el backend", () => {
    expect(toNumber("1234.5")).toBe(1234.5);
    expect(toNumber("0.00")).toBe(0);
    expect(toNumber("199.99")).toBe(199.99);
  });

  it("deja pasar los números tal cual", () => {
    expect(toNumber(42)).toBe(42);
    expect(toNumber(0)).toBe(0);
  });

  it("colapsa a 0 lo ausente o vacío en vez de propagar NaN", () => {
    // Un NaN suelto se propaga a toda la aritmética de la pantalla y acaba
    // pintando "$NaN" en el ticket; es preferible el 0 explícito.
    expect(toNumber(null)).toBe(0);
    expect(toNumber(undefined)).toBe(0);
    expect(toNumber("")).toBe(0);
  });

  it("colapsa a 0 lo que no es numérico", () => {
    expect(toNumber("abc")).toBe(0);
    expect(toNumber("12abc")).toBe(0);
    expect(toNumber(Infinity)).toBe(0);
    expect(toNumber(NaN)).toBe(0);
  });

  it("no redondea ni altera el valor recibido", () => {
    // El cliente no es autoridad sobre el dinero: si el backend dice 10.005,
    // esta función no debe decidir a qué lado cae.
    expect(toNumber("10.005")).toBe(10.005);
    expect(toNumber("0.1")).toBe(0.1);
  });
});

describe("formatMoney", () => {
  it("formatea el string del backend como moneda con dos decimales", () => {
    expect(normalizar(formatMoney("1234.5"))).toBe("$1,234.50");
    expect(normalizar(formatMoney("0"))).toBe("$0.00");
    expect(normalizar(formatMoney("199.9"))).toBe("$199.90");
  });

  it("siempre muestra dos decimales, aunque el backend mande enteros", () => {
    expect(normalizar(formatMoney(1500))).toBe("$1,500.00");
    expect(normalizar(formatMoney("1500"))).toBe("$1,500.00");
  });

  it("muestra $0.00 ante valores ausentes en vez de romper la pantalla", () => {
    expect(normalizar(formatMoney(null))).toBe("$0.00");
    expect(normalizar(formatMoney(undefined))).toBe("$0.00");
    expect(normalizar(formatMoney(""))).toBe("$0.00");
  });

  it("formatea importes grandes con separador de miles", () => {
    expect(normalizar(formatMoney("1234567.89"))).toBe("$1,234,567.89");
  });

  it("conserva el signo de un importe negativo (devoluciones/ajustes)", () => {
    expect(normalizar(formatMoney("-250.5"))).toContain("250.50");
    expect(normalizar(formatMoney("-250.5"))).toMatch(/^-/);
  });
});

describe("formatDecimal", () => {
  it("formatea sin símbolo de moneda", () => {
    expect(normalizar(formatDecimal("1234.5"))).toBe("1,234.50");
  });

  it("respeta los dígitos pedidos (cantidades de inventario van a 3)", () => {
    expect(normalizar(formatDecimal("2.5", 3))).toBe("2.500");
    expect(normalizar(formatDecimal("10", 0))).toBe("10");
  });
});
