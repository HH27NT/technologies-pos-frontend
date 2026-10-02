/**
 * Parser del pegado de la rejilla "Cargar menú" (M06, Fase B).
 *
 * El estándar del mercado para carga masiva es el CSV con plantilla (Toast,
 * Lightspeed), y es justo lo que el cliente objetivo no va a hacer: llega con el
 * menú en papel, en una nota de WhatsApp o en una hoja de cálculo que armó a mano.
 * Por eso el parser no exige formato: acepta lo que la gente ya tiene pegado en el
 * portapapeles y deja el resto a la revisión en pantalla.
 *
 * Formatos que entiende, todos vistos en menús reales:
 *   Excel / Sheets (TSV)   "Corona\t45"
 *   Lista suelta           "Corona 45"
 *   Con separadores        "Corona - $45"  ·  "Corona ....... 45.00"
 *   Con viñetas            "- Corona 45"   ·  "1. Corona 45"
 *   Encabezados de bloque  "CERVEZAS"      ·  "Cervezas:"
 *
 * Nada de lo que sale de aquí se guarda solo: alimenta la rejilla, donde se revisa.
 * Ante la duda el parser **no adivina**: deja el precio vacío y que la persona lo
 * ponga, que es más barato que un precio inventado que nadie va a releer.
 */

/** Una fila salida del pegado, aún sin validar contra el catálogo. */
export interface FilaPegada {
  nombre: string;
  /** `null` cuando la línea no traía precio reconocible. */
  precio: number | null;
  /** Nombre del encabezado de bloque bajo el que venía la línea, si hubo. */
  categoria: string | null;
}

export interface ResultadoPegado {
  filas: FilaPegada[];
  /**
   * Columnas que traía el pegado más allá de nombre y precio. Se avisa en vez de
   * tragárselas en silencio: quien pegó cinco columnas cree que llegaron cinco.
   */
  columnasIgnoradas: number;
}

/** Viñetas y numeración de lista al principio de la línea. */
const VINETA = /^\s*(?:[-–—•*·]+|\d{1,3}[.)])\s+/;

/** Relleno entre el nombre y el precio: guiones, puntos suspensivos, dos puntos, tabuladores. */
const RELLENO = /[\s.·:;=$\-–—_]+$/;

/**
 * Convierte el texto de un precio a número. El separador decimal es ambiguo entre
 * es-MX ("45.50") y lo que escribe mucha gente ("45,50"), así que se decide por la
 * forma: tres dígitos después de la coma son millares ("1,200"), uno o dos son
 * decimales ("45,5"). Un formato que no encaje devuelve null en vez de un número
 * inventado.
 */
function aNumero(bruto: string): number | null {
  const limpio = bruto.replace(/[$\s]/g, "");
  if (limpio === "") return null;

  let normalizado = limpio;
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(limpio)) {
    normalizado = limpio.replace(/,/g, ""); // 1,200.50 → 1200.50
  } else if (/^\d+,\d{1,2}$/.test(limpio)) {
    normalizado = limpio.replace(",", "."); // 45,50 → 45.50
  } else if (limpio.includes(",")) {
    return null; // Forma que no sabemos leer: mejor vacío que adivinado.
  }

  const n = Number(normalizado);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Separa "nombre precio" cuando no hay tabulador: el precio es el número con el que
 * **termina** la línea y el nombre es todo lo anterior.
 *
 * Que el patrón esté anclado al final resuelve solo el caso de "Corona 355ml": ahí
 * el número no cierra la línea, no hay match, y el 355 se queda en el nombre —que es
 * lo correcto. Si no queda nombre, la línea entera es el nombre y el precio va vacío.
 */
function separarNombreYPrecio(linea: string): { nombre: string; precio: number | null } {
  const conPrecio = /^(.*?)(\$?\s*\d[\d.,]*)\s*$/.exec(linea);
  if (!conPrecio) return { nombre: linea.trim(), precio: null };

  const [, izquierda, bruto] = conPrecio;
  const precio = aNumero(bruto);
  const nombre = izquierda.replace(RELLENO, "").trim();

  if (precio === null || nombre === "") return { nombre: linea.trim(), precio: null };
  return { nombre, precio };
}

/**
 * Un encabezado de bloque es una línea sin precio que anuncia una sección:
 * termina en dos puntos, o va en mayúsculas sin dígitos. Se exige que sea corta
 * porque un párrafo en mayúsculas no es una categoría, es un aviso.
 */
function esEncabezado(linea: string): boolean {
  if (/\d/.test(linea)) return false;
  if (linea.endsWith(":")) return true;
  const palabras = linea.split(/\s+/);
  return palabras.length <= 4 && linea === linea.toUpperCase() && /[a-záéíóúñ]/i.test(linea);
}

/** Normaliza un encabezado para mostrarlo: quita los dos puntos finales. */
function limpiarEncabezado(linea: string): string {
  return linea.replace(/:\s*$/, "").trim();
}

/**
 * Parsea el contenido del portapapeles a filas de la rejilla. Nunca lanza: un
 * pegado raro produce filas con el precio vacío, no un error que borre el trabajo.
 */
export function parsearMenuPegado(texto: string): ResultadoPegado {
  const filas: FilaPegada[] = [];
  let columnasIgnoradas = 0;
  let categoria: string | null = null;

  for (const cruda of texto.split(/\r?\n/)) {
    const linea = cruda.trim();
    if (linea === "") continue;

    if (linea.includes("\t")) {
      // Viene de una hoja de cálculo: las columnas ya están separadas, no hay que
      // adivinar dónde termina el nombre.
      const celdas = cruda.split("\t").map((c) => c.trim());
      const [nombre = "", precio = "", ...extra] = celdas;
      if (extra.filter((c) => c !== "").length > 0) {
        columnasIgnoradas = Math.max(columnasIgnoradas, extra.length);
      }
      if (nombre === "") continue;
      filas.push({ nombre, precio: aNumero(precio), categoria });
      continue;
    }

    const sinVineta = linea.replace(VINETA, "").trim();
    if (sinVineta === "") continue;

    if (esEncabezado(sinVineta)) {
      categoria = limpiarEncabezado(sinVineta);
      continue;
    }

    const { nombre, precio } = separarNombreYPrecio(sinVineta);
    if (nombre === "") continue;
    filas.push({ nombre, precio, categoria });
  }

  return { filas, columnasIgnoradas };
}
