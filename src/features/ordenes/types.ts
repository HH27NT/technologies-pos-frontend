/**
 * Tipos del módulo Órdenes (M11, POS núcleo). Reflejan el Resource del backend
 * (el `data` ya desenvuelto por el cliente Axios). Formas verificadas contra el
 * backend real (GET/POST /ordenes, items, comanda, descuento, cancelar, anular).
 *
 * Los importes (`subtotal`, `descuento`, `impuesto`, `total`, `precio_unitario`,
 * `cantidad`) llegan CONGELADOS como string (regla de oro #6): solo se muestran,
 * nunca se recalculan en el cliente. El backend recalcula los totales excluyendo
 * los ítems cancelados.
 */

import type { MesaRecurso } from "@/features/mesas";

export type EstadoOrden = "abierta" | "pagada" | "anulada" | "cerrada";
export type EstadoItem = "activo" | "cancelado";

/** Producto embebido en un ítem (subconjunto del Resource de producto). */
export interface ProductoDeItem {
  id: number;
  nombre: string;
  precio_venta: string;
  disponible: boolean | null;
}

/** Ítem (detalle) de una orden. */
export interface ItemOrden {
  id: number;
  id_producto: number;
  cantidad: string;
  precio_unitario: string;
  descuento_item: string;
  subtotal: string;
  /** true cuando ya se envió a comanda (cocina/barra). */
  enviado: boolean;
  estado_item: EstadoItem;
  cancelado_at: string | null;
  notas: string | null;
  producto: ProductoDeItem;
}

/** Orden. `detalles` solo viene en el detalle y en respuestas de escritura. */
export interface Orden {
  id: number;
  folio: string;
  estado: EstadoOrden;
  id_mesa: number | null;
  id_tipo_orden: number;
  id_sesion_caja: number;
  id_usuario: number;
  descuento: string;
  subtotal: string;
  impuesto: string;
  total: string;
  notas: string | null;
  abierta_at: string;
  cerrada_at: string | null;
  mesa: MesaRecurso | null;
  /** Cuenta que abrió la orden. Forma mínima {id, nombre}. */
  usuario?: { id: number; nombre: string } | null;
  /** Mesero firmado con PIN en terminal compartida; null con dispositivo por mesero. */
  id_mesero?: number | null;
  /**
   * Atribución final ya resuelta por el backend (`COALESCE(id_mesero, id_usuario)`).
   * No repitas el COALESCE en el front: los dos escenarios tienen una sola regla.
   */
  id_mesero_efectivo?: number | null;
  /** Datos del mesero firmante, cuando la relación viene cargada. */
  mesero?: { id: number; nombre: string } | null;
  detalles?: ItemOrden[];
}

/** GET /ordenes/{id}/saldo (M12). Números, no strings. */
export interface SaldoOrden {
  total: number;
  pagado: number;
  saldo: number;
  pagada: boolean;
}
