/**
 * Tipos del módulo Pagos (M12). Formas verificadas contra el backend real
 * (POST /ordenes/{id}/pagos). El `monto` del pago llega CONGELADO como string
 * (regla de oro #6); el `saldo` y el `cambio` de la respuesta son números que
 * calcula el backend: nunca se recalculan en el cliente.
 */

import type { EstadoOrden } from "@/features/ordenes";

/** Un pago registrado sobre una orden. */
export interface Pago {
  id: number;
  id_orden: number;
  id_tipo_pago: number;
  id_usuario: number;
  monto: string;
  referencia: string | null;
  pagado_at: string;
  /** Nombre del tipo de pago que expone el backend (efectivo/tarjeta/transferencia). */
  tipo_pago: string;
}

/**
 * Insumo que la venta dejó en negativo (P2 del backend: nunca bloquea el cobro,
 * solo avisa). Solo aparece cuando este pago cierra la orden y descuenta inventario.
 */
export interface AvisoStock {
  id_insumo: number;
  insumo: string | null;
  stock_resultante: number;
}

/**
 * Respuesta de POST /ordenes/{id}/pagos. `cambio` solo es > 0 en efectivo con
 * sobre-entrega (el backend recorta el `monto` registrado al saldo). `saldo` es
 * el pendiente tras este pago; `estado_orden` pasa a "pagada" cuando llega a 0.
 */
export interface RegistrarPagoResponse {
  pago: Pago;
  cambio: number;
  saldo: number;
  estado_orden: EstadoOrden;
  avisos_stock: AvisoStock[];
}
