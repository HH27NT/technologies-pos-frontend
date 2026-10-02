import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/api/client";
import { qk } from "@/lib/api/queryKeys";
import type { Paginated } from "@/lib/api/types";
import type { RegistroAuditoria } from "./types";

/**
 * Hooks de datos de Auditoría (M15). Solo lectura, paginado por `meta`.
 *
 * - `/auditoria`        → ledger del tenant (permiso `auditoria.ver`, admin).
 * - `/auditoria/global` → ledger de todos los tenants (permiso `auditoria.global`,
 *   solo super_admin; al admin le responde 403).
 *
 * `global` decide el endpoint; la página lo fija según `esSuperAdmin`.
 */
export function useAuditoria(params?: Record<string, unknown>, global = false) {
  const ruta = global ? "/auditoria/global" : "/auditoria";
  return useQuery({
    queryKey: [...qk.auditoria.list(params), global ? "global" : "tenant"] as const,
    queryFn: () => client.get<Paginated<RegistroAuditoria>>(ruta, { params }),
  });
}
