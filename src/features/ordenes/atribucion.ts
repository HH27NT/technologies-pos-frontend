import type { Orden } from "./types";

/**
 * Quién atendió la orden, en los dos escenarios de operación.
 *
 * Con **dispositivo por mesero** la cuenta ES la persona (`usuario`). Con **terminal
 * compartida** la cuenta es la tablet y la persona es quien firmó con su PIN (`mesero`).
 * El backend ya resolvió cuál manda en `id_mesero_efectivo`; aquí solo se elige el
 * nombre a enseñar, con `usuario` de respaldo — si no, en terminal compartida todas las
 * órdenes dirían el nombre de la tablet.
 */
export function meseroDeOrden(orden: Orden): { id: number; nombre: string } | null {
  if (orden.mesero) return orden.mesero;
  // Hay firma de PIN pero la relación no vino cargada en esta respuesta: mejor no
  // decir nada que atribuirle la venta a la cuenta de la tablet. El respaldo a
  // `usuario` solo vale cuando de verdad NO hay mesero firmante.
  if (orden.id_mesero) return null;
  return orden.usuario ?? null;
}

/** ¿Esta orden es de la persona indicada? Compara contra la atribución efectiva. */
export function esOrdenDe(orden: Orden, idPersona: number): boolean {
  return (orden.id_mesero_efectivo ?? orden.id_usuario) === idPersona;
}
