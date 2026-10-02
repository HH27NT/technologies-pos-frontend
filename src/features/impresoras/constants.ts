/**
 * Tipos de impresora (M13). Enum CONFIRMADO contra el backend real: `barra`,
 * `cocina`, `ticket` (otros valores devuelven "Tipo de impresora inválido.").
 * Barra/cocina imprimen comandas; ticket imprime el ticket de cobro.
 */
export interface TipoImpresora {
  value: string;
  label: string;
}

export const TIPOS_IMPRESORA: TipoImpresora[] = [
  { value: "barra", label: "Barra" },
  { value: "cocina", label: "Cocina" },
  { value: "ticket", label: "Ticket" },
];

export function tipoImpresoraLabel(value: string): string {
  return TIPOS_IMPRESORA.find((t) => t.value === value)?.label ?? value;
}
