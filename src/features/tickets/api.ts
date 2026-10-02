import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client } from "@/lib/api/client";
import { qk } from "@/lib/api/queryKeys";
import type { ApiError } from "@/lib/api/types";
import type { Ticket } from "./types";

/**
 * Hooks de datos de Tickets (M13). Emitir exige `tickets.imprimir` y que la orden
 * esté pagada (el backend responde "Solo se emite ticket de cobro de una orden
 * pagada." si no lo está). Reimprimir exige `tickets.reimprimir` y queda AUDITADA
 * en el backend. Errores mostrados tal cual (regla #2).
 */

/** POST /ordenes/{id}/ticket — emite el ticket de cobro de una orden pagada. */
export function useEmitirTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (idOrden: number) => client.post<Ticket>(`/ordenes/${idOrden}/ticket`),
    onSuccess: (ticket) => {
      qc.setQueryData(qk.tickets.detail(ticket.id), ticket);
      toast.success("Ticket emitido");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

/** GET /tickets/{id} — vista previa del ticket. */
export function useTicket(id: number | undefined) {
  return useQuery({
    queryKey: qk.tickets.detail(id ?? 0),
    queryFn: () => client.get<Ticket>(`/tickets/${id}`),
    enabled: id != null,
  });
}

/** POST /tickets/{id}/reimprimir — reenvía a impresión (auditada). */
export function useReimprimirTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => client.post<Ticket>(`/tickets/${id}/reimprimir`),
    onSuccess: (ticket) => {
      qc.setQueryData(qk.tickets.detail(ticket.id), ticket);
      toast.success("Ticket reenviado a impresión");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}
