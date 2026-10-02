import { useMutation } from "@tanstack/react-query";
import { client } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth";
import type { LoginInput } from "./schemas";
import type { LoginResponse } from "./types";

/**
 * POST /auth/login → { token, token_type, usuario }. Solo obtiene el token; la
 * hidratación de permisos/caja la hace bootstrapSession (GET /auth/me + /caja/actual).
 */
export function useLogin() {
  return useMutation({
    mutationFn: (input: LoginInput) =>
      client.post<LoginResponse>("/auth/login", input),
  });
}

/**
 * POST /auth/logout invalida el token en el backend. Pase lo que pase con la
 * petición, limpiamos la sesión local (el token puede haber expirado ya).
 */
export function useLogout() {
  return useMutation({
    mutationFn: () => client.post("/auth/logout"),
    onSettled: () => {
      useAuthStore.getState().clearSession();
    },
  });
}
