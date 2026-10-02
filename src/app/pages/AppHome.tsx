import { Suspense, lazy } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore, useCan } from "@/lib/auth";
import { RouteFallback } from "../layout/RouteFallback";
import { PanelPlataforma } from "./PanelPlataforma";

/**
 * Dashboard de decisiones del tenant. Va en un chunk aparte (lazy) porque arrastra
 * Recharts: así el bundle inicial no lo carga; quien no lo ve ni lo pide.
 */
const DashboardInicio = lazy(() =>
  import("@/features/reportes/components/dashboard/DashboardInicio").then((m) => ({
    default: m.DashboardInicio,
  })),
);

/**
 * Pantalla de inicio de la app protegida. Aterrizaje por rol (guiado por permiso):
 *  - super admin → resumen de plataforma.
 *  - admin (`reportes.ver_dashboard`) → dashboard de decisiones.
 *  - gerente (sin `reportes.ver_dashboard` pero con `reportes.ver`) → Reportes. Si
 *    aterrizara en /pos, el link "Administración" del propio POS (que sí ve, porque
 *    depende de `reportes.ver`) lo devolvería aquí y rebotaría de vuelta a /pos: un
 *    ciclo silencioso. Reportes es una página que el gerente sí tiene completa.
 *  - operador/mesero (ni uno ni otro permiso) → directo a su pantalla operativa
 *    (POS); el POS ya maneja el estado "sin caja abierta".
 */
export function AppHome() {
  const esSuperAdmin = useAuthStore((s) => s.esSuperAdmin);
  const puedeVerDashboard = useCan("reportes.ver_dashboard");
  const puedeVerReportes = useCan("reportes.ver");

  if (esSuperAdmin) {
    return <PanelPlataforma />;
  }

  if (!puedeVerDashboard) {
    return <Navigate to={puedeVerReportes ? "/app/reportes" : "/pos"} replace />;
  }

  return (
    <Suspense fallback={<RouteFallback />}>
      <DashboardInicio />
    </Suspense>
  );
}
