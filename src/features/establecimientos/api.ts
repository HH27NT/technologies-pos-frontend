import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client } from "@/lib/api/client";
import { qk } from "@/lib/api/queryKeys";
import type { ApiError, Paginated } from "@/lib/api/types";
import type {
  AdministradorRecurso,
  EstablecimientoRecurso,
  RestablecerAccesoResultado,
} from "./types";
import type { RolPersonal } from "./schemas";

/**
 * Hooks de datos de Plataforma / Establecimientos (M02). Solo super_admin
 * (permisos `establecimientos.gestionar/activar`). Errores del backend mostrados
 * tal cual (regla #2). Este módulo SÍ maneja el establecimiento como entidad
 * (es el que cruza tenants).
 */

/** GET /establecimientos — lista paginada. */
export function useEstablecimientos(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: qk.establecimientos.list(params),
    queryFn: () =>
      client.get<Paginated<EstablecimientoRecurso>>("/establecimientos", { params }),
  });
}

/** Datos del administrador inicial que se crea junto al establecimiento. */
export interface AdminInicialPayload {
  nombre: string;
  username: string;
  password: string;
  /** Opcional: identificador principal es `username` (backend acepta email nulo). */
  email?: string;
}

/** Una fila de personal adicional (gerente/operador/mesero) del wizard de alta. */
export interface PersonalPayload {
  rol: RolPersonal;
  nombre: string;
  username: string;
  password: string;
  email?: string;
}

export interface GuardarEstablecimientoPayload {
  id?: number;
  nombre: string;
  razon_social: string | null;
  rfc: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  zona_horaria: string;
  moneda: string;
  /** Solo al crear: el backend crea el establecimiento y su admin en un paso. */
  admin?: AdminInicialPayload;
  /** Solo al crear, opcional: el resto del equipo en el mismo paso. */
  personal?: PersonalPayload[];
}

/** Correo vacío se omite: el backend distingue "sin correo" (null) de "". */
function limpiarCorreo<T extends { email?: string }>(persona: T): T {
  return { ...persona, email: persona.email?.trim() ? persona.email.trim() : undefined };
}

/** POST /establecimientos (crear) o PUT /establecimientos/{id} (editar). */
export function useGuardarEstablecimiento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, admin, personal, ...datos }: GuardarEstablecimientoPayload) => {
      if (id) {
        return client.put<EstablecimientoRecurso>(`/establecimientos/${id}`, datos);
      }
      return client.post<EstablecimientoRecurso>("/establecimientos", {
        ...datos,
        admin: admin ? limpiarCorreo(admin) : undefined,
        personal: personal?.length ? personal.map(limpiarCorreo) : undefined,
      });
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.establecimientos.all });
      toast.success(variables.id ? "Establecimiento actualizado" : "Establecimiento creado");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

/**
 * GET /establecimientos/{id}/administradores — admins del bar para el selector del
 * rescate. Solo se dispara cuando hay id (el diálogo abierto), no en cada render.
 */
export function useAdministradores(id?: number) {
  return useQuery({
    queryKey: qk.establecimientos.administradores(id ?? 0),
    queryFn: () =>
      client.get<AdministradorRecurso[]>(`/establecimientos/${id}/administradores`),
    enabled: id != null,
  });
}

/**
 * POST /establecimientos/{id}/restablecer-acceso — rescate del admin. Devuelve la
 * contraseña temporal UNA sola vez; el diálogo la muestra (no se guarda en caché).
 */
export function useRestablecerAcceso() {
  return useMutation({
    mutationFn: ({ id, id_usuario }: { id: number; id_usuario: number }) =>
      client.post<RestablecerAccesoResultado>(
        `/establecimientos/${id}/restablecer-acceso`,
        { id_usuario },
      ),
    onError: (e: ApiError) => toast.error(e.message),
  });
}

/** PATCH /establecimientos/{id}/activar — alterna activo/inactivo. */
export function useActivarEstablecimiento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      client.patch<EstablecimientoRecurso>(`/establecimientos/${id}/activar`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.establecimientos.all });
      toast.success("Estado actualizado");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}
