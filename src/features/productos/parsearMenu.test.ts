import { describe, expect, it } from "vitest";
import { parsearMenuPegado } from "./parsearMenu";

/**
 * El parser es la pieza que decide si la rejilla sirve: si solo entendiera TSV,
 * el cliente que llega con el menú en una nota de WhatsApp seguiría tecleando de a
 * uno. Cada caso de aquí es una forma real de escribir un menú.
 */
describe("parsearMenuPegado", () => {
  it("lee lo pegado desde una hoja de cálculo (TSV)", () => {
    const { filas } = parsearMenuPegado("Corona\t45\nVictoria\t42\nModelo\t48");

    expect(filas).toEqual([
      { nombre: "Corona", precio: 45, categoria: null },
      { nombre: "Victoria", precio: 42, categoria: null },
      { nombre: "Modelo", precio: 48, categoria: null },
    ]);
  });

  it("avisa cuántas columnas de más traía el pegado", () => {
    // Tragarse columnas en silencio hace creer que llegaron datos que no llegaron.
    const { filas, columnasIgnoradas } = parsearMenuPegado("Corona\t45\tCervezas\tCRV-01");

    expect(filas).toEqual([{ nombre: "Corona", precio: 45, categoria: null }]);
    expect(columnasIgnoradas).toBe(2);
  });

  it("lee una lista suelta separada por espacios", () => {
    const { filas } = parsearMenuPegado("Corona 45\nMichelada 75");

    expect(filas).toEqual([
      { nombre: "Corona", precio: 45, categoria: null },
      { nombre: "Michelada", precio: 75, categoria: null },
    ]);
  });

  it("aguanta los separadores con los que se escribe un menú a mano", () => {
    const { filas } = parsearMenuPegado(
      ["Corona - $45", "Michelada ....... 75.50", "Agua mineral: 25", "Café — $30"].join("\n"),
    );

    expect(filas.map((f) => f.nombre)).toEqual([
      "Corona",
      "Michelada",
      "Agua mineral",
      "Café",
    ]);
    expect(filas.map((f) => f.precio)).toEqual([45, 75.5, 25, 30]);
  });

  it("quita viñetas y numeración de lista", () => {
    const { filas } = parsearMenuPegado("- Corona 45\n• Victoria 42\n1. Modelo 48\n2) Indio 40");

    expect(filas.map((f) => f.nombre)).toEqual(["Corona", "Victoria", "Modelo", "Indio"]);
    expect(filas.map((f) => f.precio)).toEqual([45, 42, 48, 40]);
  });

  it("no confunde la presentación del producto con el precio", () => {
    // "Corona 355ml" no termina en número: el 355 se queda en el nombre, que es lo
    // correcto. Un parser que se lo lleve deja un producto llamado "Corona" a $355.
    const { filas } = parsearMenuPegado("Corona 355ml\nVictoria 355ml 42");

    expect(filas).toEqual([
      { nombre: "Corona 355ml", precio: null, categoria: null },
      { nombre: "Victoria 355ml", precio: 42, categoria: null },
    ]);
  });

  it("entiende la coma como decimal y como millar", () => {
    const { filas } = parsearMenuPegado("Mezcal 45,50\nBotella 1,200\nBarril 1,200.50");

    expect(filas.map((f) => f.precio)).toEqual([45.5, 1200, 1200.5]);
  });

  it("deja el precio vacío antes que inventarlo", () => {
    // Una forma que no sabemos leer se marca en la rejilla; adivinar un precio que
    // nadie va a releer es peor que pedir que lo escriban.
    const { filas } = parsearMenuPegado("Combo raro 1,2,3\nSolo el nombre");

    expect(filas.map((f) => f.precio)).toEqual([null, null]);
    expect(filas.map((f) => f.nombre)).toEqual(["Combo raro 1,2,3", "Solo el nombre"]);
  });

  it("reconoce los encabezados de sección y los reparte por bloque", () => {
    const { filas } = parsearMenuPegado(
      ["CERVEZAS", "Corona 45", "Victoria 42", "Destilados:", "Mezcal 90", "Tequila 85"].join("\n"),
    );

    expect(filas).toEqual([
      { nombre: "Corona", precio: 45, categoria: "CERVEZAS" },
      { nombre: "Victoria", precio: 42, categoria: "CERVEZAS" },
      { nombre: "Mezcal", precio: 90, categoria: "Destilados" },
      { nombre: "Tequila", precio: 85, categoria: "Destilados" },
    ]);
  });

  it("ignora líneas vacías y espacios sobrantes", () => {
    const { filas } = parsearMenuPegado("\n  Corona   45  \n\n\n   \nVictoria 42\n");

    expect(filas).toEqual([
      { nombre: "Corona", precio: 45, categoria: null },
      { nombre: "Victoria", precio: 42, categoria: null },
    ]);
  });

  it("no devuelve nada con un pegado vacío", () => {
    expect(parsearMenuPegado("").filas).toEqual([]);
    expect(parsearMenuPegado("   \n  \n").filas).toEqual([]);
  });

  it("no toma por encabezado un párrafo en mayúsculas", () => {
    // Un aviso largo en mayúsculas es texto, no una sección; convertirlo en categoría
    // dejaría los productos siguientes colgados de algo que no existe.
    const { filas } = parsearMenuPegado(
      "PRECIOS SUJETOS A CAMBIO SIN PREVIO AVISO\nCorona 45",
    );

    expect(filas[0].nombre).toBe("PRECIOS SUJETOS A CAMBIO SIN PREVIO AVISO");
    expect(filas[1].categoria).toBeNull();
  });
});
