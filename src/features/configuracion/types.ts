/**
 * Tipos del módulo Configuración (M03). Forma verificada contra el backend real
 * (GET/PUT /configuracion). Es un singleton por establecimiento (tenant implícito,
 * regla #4): no se envía ni se recibe `id_establecimiento`.
 */

/** Resource de la configuración del establecimiento. */
export interface ConfiguracionRecurso {
  id: number;
  nombre_comercial: string | null;
  telefono_ticket: string | null;
  direccion_ticket: string | null;
  /** Si el ticket se imprime automáticamente al cobrar. */
  impresion_automatica: boolean;
  /** Modo "terminal compartida": el POS pide PIN de mesero para atribuir la venta.
   * Apagado por defecto; un local con dispositivo por mesero no ve ningún cambio. */
  terminal_compartida: boolean;
  /** Segundos de inactividad tras los que la terminal se bloquea sola (30–3600). */
  bloqueo_terminal_segundos: number;
  /** Umbral global de stock bajo; null = sin umbral. El backend lo envía como
   * string decimal cuando tiene valor (p. ej. "5.000"). */
  stock_minimo_global: number | string | null;
  /** Si las órdenes aplican impuesto. */
  aplica_impuesto: boolean;
  /** Tasa de impuesto (p. ej. 16 = 16%); null = sin tasa. String decimal cuando
   * tiene valor (p. ej. "16.00"), como el resto del dinero congelado del backend. */
  tasa_impuesto: number | string | null;
}
