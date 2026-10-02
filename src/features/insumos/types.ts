import type { UnidadRecurso } from "@/features/unidades";

/**
 * Tipos del módulo Insumos + movimientos/kardex (M08). Reflejan los Resource del
 * backend (el `data` ya desenvuelto). Formas verificadas contra el backend real.
 *
 * Importante: `stock_actual` es de **solo lectura** — se mueve con movimientos
 * (entrada/ajuste/merma), nunca se captura en el formulario del insumo. Los
 * importes/cantidades llegan como **string**; solo se muestran (regla #6).
 */

/** Proveedor anidado (mínimo) dentro del Resource de insumo. */
export interface ProveedorMini {
  id: number;
  nombre: string;
}

/**
 * Cómo se descuenta la existencia del insumo:
 *  - `controlado`: por receta, al vender. Alcohol, latas, carne, café.
 *  - `consumo`: no se descuenta al vender; se cuadra con conteo físico y ajuste.
 *    Tamarindo, chamoy, sal, hielo: lo que se echa al tanteo y nadie puede medir.
 */
export type TipoInsumo = "controlado" | "consumo";

/** Resource de un insumo. */
export interface InsumoRecurso {
  id: number;
  nombre: string;
  tipo: TipoInsumo;
  id_unidad_medida: number;
  id_proveedor: number | null;
  /** Existencia actual (string, read-only): se mueve con movimientos. */
  stock_actual: string;
  stock_minimo: string;
  costo_unitario: string | null;
  activo: boolean | null;
  /** Derivado por el backend: stock_actual < stock_minimo. */
  stock_bajo: boolean;
  unidad_medida: UnidadRecurso;
  proveedor: ProveedorMini | null;
}

/** Tipos de movimiento de inventario. */
export type TipoMovimiento = "entrada" | "ajuste" | "merma";

/** Resource de un movimiento de inventario (renglón del kardex). */
export interface MovimientoRecurso {
  id: number;
  id_insumo: number;
  tipo: TipoMovimiento;
  cantidad: string;
  costo_unitario: string | null;
  /** Existencia resultante tras aplicar el movimiento (congelada por el backend). */
  stock_resultante: string;
  motivo: string | null;
  id_usuario: number;
  created_at: string | null;
}
