import type { UnidadRecurso } from "./types";

/**
 * Unidad con la que arranca un insumo que se cuenta por bultos: botellas, latas,
 * bolsas. Es "Pieza", que viene sembrada como unidad global del sistema.
 *
 * Existe para no preguntar lo que el sistema puede decidir: quien da de alta una
 * cerveza no está eligiendo una unidad de medida, está diciendo "esto se cuenta de
 * una en una". La unidad sigue a la vista y se puede cambiar en Insumos.
 *
 * Los respaldos van en orden de menos malo: si el nombre "Pieza" cambiara, se usa
 * cualquier unidad global (todas son de conteo o de volumen razonables) y, en el
 * peor caso, la primera que haya. Devuelve `undefined` solo si no hay ninguna, que
 * es cuando la interfaz debe esconder el atajo en vez de fallar al guardar.
 */
export function unidadPorDefecto(unidades: UnidadRecurso[]): UnidadRecurso | undefined {
  const porNombre = unidades.find(
    (u) => u.es_global && u.nombre.trim().toLowerCase() === "pieza",
  );
  return porNombre ?? unidades.find((u) => u.es_global) ?? unidades[0];
}
