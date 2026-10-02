/**
 * Catálogo de tipos de pago (M12). El backend NO expone un endpoint de catálogo;
 * `id_tipo_pago` es un enum fijo CONFIRMADO contra el backend real: 1=efectivo,
 * 2=tarjeta, 3=transferencia (el id 4 devuelve "El tipo de pago no es válido.").
 * El nombre también viene en la respuesta del pago (`tipo_pago`).
 *
 * `permiteCambio`: solo efectivo admite sobre-entrega — el backend recorta el
 * `monto` registrado al saldo y devuelve el `cambio`. Tarjeta y transferencia
 * rechazan el sobrepago ("El monto excede el saldo pendiente de la orden.").
 * `pideReferencia`: tarjeta/transferencia muestran el campo de referencia.
 */
export interface TipoPago {
  id: number;
  nombre: string;
  label: string;
  permiteCambio: boolean;
  pideReferencia: boolean;
}

export const TIPOS_PAGO: TipoPago[] = [
  { id: 1, nombre: "efectivo", label: "Efectivo", permiteCambio: true, pideReferencia: false },
  { id: 2, nombre: "tarjeta", label: "Tarjeta", permiteCambio: false, pideReferencia: true },
  {
    id: 3,
    nombre: "transferencia",
    label: "Transferencia",
    permiteCambio: false,
    pideReferencia: true,
  },
];

export function tipoPago(id: number): TipoPago | undefined {
  return TIPOS_PAGO.find((t) => t.id === id);
}
