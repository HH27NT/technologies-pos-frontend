import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client } from "@/lib/api/client";
import { qk } from "@/lib/api/queryKeys";
import type { ApiError, Paginated } from "@/lib/api/types";
import type { EstadoMeseroPin, UsuarioRecurso } from "./types";

/**
 * Hooks de datos de Usuarios y roles (M04). Lecturas paginadas + mutaciones con
 * invalidación de query keys. Errores del backend mostrados tal cual (regla #2).
 * Nunca se envía `id_establecimiento` (regla #4).
 */

/** GET /usuarios — lista paginada. `params` lleva page/filtros. */
export function useUsuarios(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: qk.usuarios.list(params),
    queryFn: () => client.get<Paginated<UsuarioRecurso>>("/usuarios", { params }),
  });
}

// `useRoles` vive en `features/roles/api`: el selector de rol de esta pantalla lo
// consume desde ahí, junto con los roles a medida del editor.

/** Payload que envía el formulario (sin id para crear; con id para editar). */
export interface GuardarUsuarioPayload {
  id?: number;
  nombre: string;
  email?: string;
  username?: string;
  password?: string;
  rol: string;
  /**
   * Rol previo (solo en edición). El `PUT /usuarios/{id}` NO acepta `rol`; el
   * cambio de rol es un endpoint aparte. Si el rol cambió, se aplica con
   * `POST /usuarios/{id}/rol` (el backend protege al último admin).
   */
  rolActual?: string;
}

/**
 * POST /usuarios (crear) o PUT /usuarios/{id} (editar). Limpia campos vacíos
 * (email/username/password) para no pisar valores ni romper required_without.
 * En alta, el `rol` viaja en el payload; en edición, se aplica por separado
 * (el PUT lo ignora) y solo si cambió.
 */
export function useGuardarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, rolActual, ...input }: GuardarUsuarioPayload) => {
      const payload: Record<string, unknown> = { nombre: input.nombre };
      if (input.email?.trim()) payload.email = input.email.trim();
      if (input.username?.trim()) payload.username = input.username.trim();
      if (input.password) payload.password = input.password;

      if (!id) {
        // Alta: el backend asigna el rol recibido en el payload.
        payload.rol = input.rol;
        return client.post<UsuarioRecurso>("/usuarios", payload);
      }

      // Edición: datos por PUT; el rol, solo si cambió, por su propio endpoint.
      const usuario = await client.put<UsuarioRecurso>(`/usuarios/${id}`, payload);
      if (input.rol && input.rol !== rolActual) {
        await client.post<UsuarioRecurso>(`/usuarios/${id}/rol`, { rol: input.rol });
      }
      return usuario;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.usuarios.all });
      // El rol pudo cambiar, y eso mueve el "N usuarios" de dos roles a la vez.
      qc.invalidateQueries({ queryKey: qk.roles.all });
      toast.success(variables.id ? "Usuario actualizado" : "Usuario creado");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

/**
 * GET /usuarios/{id}/mesero-pin — si ese miembro del personal tiene PIN de mesero.
 * `enabled` porque solo se consulta al abrir su diálogo, no al pintar la lista.
 */
export function useMeseroPin(id: number | undefined) {
  return useQuery({
    queryKey: qk.meseroPin.detail(id ?? 0),
    queryFn: () => client.get<EstadoMeseroPin>(`/usuarios/${id}/mesero-pin`),
    enabled: id !== undefined,
  });
}

/** PUT /usuarios/{id}/mesero-pin — fija o reemplaza el PIN (nunca lo devuelve). */
export function useFijarMeseroPin(id: number | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pin: string) =>
      client.put<EstadoMeseroPin>(`/usuarios/${id}/mesero-pin`, { pin }),
    onSuccess: (data) => {
      if (id !== undefined) qc.setQueryData(qk.meseroPin.detail(id), data);
      toast.success("PIN de mesero actualizado");
    },
    // El 422 de PIN en uso o trivial lo aterriza el diálogo en su campo; aquí no
    // se hace toast para no duplicar el aviso.
  });
}

/** DELETE /usuarios/{id}/mesero-pin — retira el PIN. */
export function useQuitarMeseroPin(id: number | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => client.delete<EstadoMeseroPin>(`/usuarios/${id}/mesero-pin`),
    onSuccess: (data) => {
      if (id !== undefined) qc.setQueryData(qk.meseroPin.detail(id), data);
      toast.success("PIN de mesero retirado");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}

/** PATCH /usuarios/{id}/activar — alterna activo/inactivo. */
export function useActivarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => client.patch<UsuarioRecurso>(`/usuarios/${id}/activar`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.usuarios.all });
      toast.success("Estado actualizado");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });
}
