import type { Usuario } from "@/lib/auth";

/** Respuesta desenvuelta de POST /auth/login. */
export interface LoginResponse {
  token: string;
  token_type: string; // "Bearer"
  usuario: Usuario;
}
