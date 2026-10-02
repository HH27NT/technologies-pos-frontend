/**
 * Tipos del módulo Tickets (M13). Forma verificada contra el backend real
 * (POST /ordenes/{id}/ticket, GET /tickets/{id}). El backend arma el
 * `contenido_json` del ticket (comercio, orden, ítems, totales y pagos); el
 * cliente solo lo muestra (regla #6). Los importes del contenido llegan como
 * números ya calculados por el backend.
 */

export interface TicketItem {
  cantidad: number;
  producto: string;
  precio_unitario: number;
  subtotal: number;
}

export interface TicketTotales {
  subtotal: number;
  descuento: number;
  impuesto: number;
  total: number;
}

export interface TicketPagoLinea {
  tipo: string;
  monto: number;
}

/** Contenido renderizable del ticket (lo arma el backend). */
export interface TicketContenido {
  tipo: string;
  nombre_comercial: string;
  telefono: string | null;
  direccion: string | null;
  orden: { folio: string; tipo: string; mesa: string | null };
  /**
   * Quién atendió la mesa. Opcional: el `contenido_json` se congela al emitir, así que
   * los tickets anteriores a este campo no lo traen.
   */
  atendio?: string | null;
  folio_ticket: string;
  items: TicketItem[];
  totales: TicketTotales;
  pagos: TicketPagoLinea[];
}

/** Ticket emitido. `impreso_at` se sella al reimprimir/enviar a impresión. */
export interface Ticket {
  id: number;
  id_orden: number;
  tipo: string;
  folio_ticket: string;
  id_impresora: number | null;
  es_pdf: boolean;
  impreso_at: string | null;
  contenido_json: TicketContenido;
}
