/**
 * Normalización de texto para comparar y buscar como lo haría una persona.
 *
 * "Café  De Olla" y "cafe de olla" son el mismo producto para quien captura y para
 * quien busca en el POS, aunque para la base de datos no lo sean. Vive en `format`
 * —y no dentro de una feature— porque lo usan la rejilla de carga (avisar de
 * repetidos) y el buscador del POS (encontrar sin pelear con los acentos).
 */
export function normalizarTexto(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");
}
