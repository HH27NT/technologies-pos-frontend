import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client } from "@/lib/api/client";
import { qk } from "@/lib/api/queryKeys";
import type { ApiError, Paginated } from "@/lib/api/types";
import type { GuardarPinInput } from "./schemas";
import type {
  Autorizacion,
  AutorizacionOverride,
  EstadoPin,
  RefsAutorizacion,
  TipoAutorizacion,
} from "./types";

/**
 * Hooks de datos de Autorizaciones (M14) y del PIN propio (M14.1). El operador
 * SOLICITA (`autorizaciones.solicitar`); el admin APRUEBA/RECHAZA
 * (`autorizaciones.aprobar`). Aprobar ejecuta la acción en el backend, así que al
 * aprobar se invalidan las cachés de las entidades afectadas (órdenes, insumos).
 * Errores del backend mostrados tal cual (regla #2). Nunca se envía
 * `id_establecimiento` (regla #4).
 *
 * El override por PIN no vive aquí: viaja PLANO en el body del endpoint de la propia
 * acción (`useCancelarItem`, `useAnularOrden`, `useRegistrarMovimiento`).
 */

/**
 * Notifica el error de una operación sensible. Si la operación llevaba bloque de
 * override, NO emite toast: el `OverrideAutorizacionDialog` sigue abierto y muestra
 * el mismo mensaje inline, junto al PIN que hay que volver a teclear. Duplicarlo en
 * un toast solo agrega ruido en el POS.
 */
export function notificarError(e: ApiError, autorizacion?: AutorizacionOverride) {
  if (autorizacion) return;
  toast.error(e.message);
}

/** GET /autorizaciones — bandeja paginada. `params` lleva page/estado. */
export function useAutorizaciones(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: qk.autorizaciones.list(params),
    queryFn: () => client.get<Paginated<Autorizacion>>("/autorizaciones", { params }),
  });
}

export interface SolicitarAutorizacionPayload {
  tipo: TipoAutorizacion;
  motivo: string;
  /** Referencias de la operación (id_orden, id_item, id_insumo, cantidad…). */
  refs: RefsAutorizacion;
}

/** POST /autorizaciones — el operador solicita una operación sensible. */
export function useSolicitarAutorizacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tipo, motivo, refs }: SolicitarAutorizacionPayload) =>
      client.post<Autorizacion>("/autorizaciones", { tipo, motivo, ...refs }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.autorizaciones.all });
      toast.success("Solicitud de autorización enviada");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

/** Invalida la bandeja + las entidades que aprobar/rechazar pudo mover. */
function useRefrescarTrasResolver() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: qk.autorizaciones.all });
    qc.invalidateQueries({ queryKey: qk.ordenes.all });
    qc.invalidateQueries({ queryKey: qk.insumos.all });
  };
}

/** PATCH /autorizaciones/{id}/aprobar — aprueba Y ejecuta la operación. */
export function useAprobarAutorizacion() {
  const refrescar = useRefrescarTrasResolver();
  return useMutation({
    mutationFn: (id: number) => client.patch<Autorizacion>(`/autorizaciones/${id}/aprobar`),
    onSuccess: () => {
      refrescar();
      toast.success("Autorización aprobada");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

/** PATCH /autorizaciones/{id}/rechazar — rechaza la solicitud (no ejecuta nada). */
export function useRechazarAutorizacion() {
  const refrescar = useRefrescarTrasResolver();
  return useMutation({
    mutationFn: (id: number) => client.patch<Autorizacion>(`/autorizaciones/${id}/rechazar`),
    onSuccess: () => {
      refrescar();
      toast.success("Autorización rechazada");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

// --- M14.1 · PIN de autorización propio (self-service) ------------------------
// Solo el propio autorizador fija su PIN; nadie lo hace por él. El backend NUNCA
// devuelve el PIN: estos endpoints solo dicen si está configurado y desde cuándo.
// Se consumen desde `MiPinPage`, cuya ruta ya está gateada por PERMISOS_AUTORIZADOR
// (y excluye al super admin, a quien el backend responde 403 por no tener membresía).

/** GET /mi-pin — estado del PIN propio (configurado / desde cuándo). */
export function useMiPin() {
  return useQuery({
    queryKey: qk.miPin.all,
    queryFn: () => client.get<EstadoPin>("/mi-pin"),
  });
}

/**
 * PUT /mi-pin — establece o cambia el PIN propio. Exige la contraseña de acceso
 * actual: sin eso, quien encuentre una sesión abierta podría fijarse un PIN y con él
 * autorizar overrides a voluntad.
 *
 * No emite toast de error a propósito: el 422 (PIN trivial, PIN en uso, contraseña
 * incorrecta) se muestra INLINE en el formulario, junto al campo que lo causó.
 */
export function useGuardarPin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GuardarPinInput) =>
      client.put<EstadoPin>("/mi-pin", {
        pin: input.pin,
        pin_confirmation: input.pin_confirmation,
        password_actual: input.password_actual,
      }),
    onSuccess: (estado) => {
      qc.setQueryData(qk.miPin.all, estado);
      toast.success("PIN de autorización actualizado");
    },
  });
}

/** DELETE /mi-pin — borra el PIN: el usuario deja de poder autorizar por override. */
export function useEliminarPin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => client.delete<EstadoPin>("/mi-pin"),
    onSuccess: (estado) => {
      qc.setQueryData(qk.miPin.all, estado);
      toast.success("PIN de autorización eliminado");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}
