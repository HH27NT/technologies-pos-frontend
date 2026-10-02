import { Suspense } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { LayoutGrid, Lock, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthStore, useCan } from "@/lib/auth";
import { ContextoModoTema } from "@/lib/tema";
import { useLogout } from "@/features/auth";
import { useSincronizarCajaAbierta } from "@/features/caja";
import { useModoTerminal } from "@/features/terminal/api";
import { useTerminalStore } from "@/features/terminal/store";
import { useAutoBloqueo } from "@/features/terminal/useAutoBloqueo";
import { BloqueoTerminal } from "@/features/terminal/components/BloqueoTerminal";
import { RouteFallback } from "./RouteFallback";

/**
 * Shell del punto de venta (tema OSCURO, `data-mode="dark"`). Distinto del layout
 * de administración: pensado para uso táctil y turnos largos. Muestra el estado de
 * caja (compuerta del POS) y las salidas del turno.
 *
 * Afordances gateadas por permiso (regla #3), porque el POS lo usan roles muy distintos:
 *  - "Administración" solo para quien tiene un aterrizaje real ahí (`reportes.ver`, mismo
 *    permiso que decide el landing en AppHome). Sin él, `/app` rebota a `/pos` (loop).
 *  - La badge "Caja cerrada" enlaza a abrir caja solo para quien puede (`caja.abrir`); el
 *    mesero no tiene acceso a esa ruta, así que para él es puramente informativa.
 *  - "Cerrar sesión" para todos: antes el POS no tenía salida propia (el mesero no podía
 *    cerrar sesión sin pasar por Administración).
 */
export function PosLayout() {
  // Mantiene fresca la compuerta de caja: si el cajero abre/cierra caja en otra terminal,
  // el POS del mesero se entera al re-enfocar o por intervalo, sin recargar.
  useSincronizarCajaAbierta();

  // Terminal compartida: si el local opera así, el POS queda cubierto por la pantalla
  // de bloqueo hasta que alguien teclea su PIN, y se vuelve a bloquear al caducar.
  const modoTerminal = useModoTerminal();
  const pidePin = modoTerminal.data?.terminal_compartida ?? false;
  const meseroActivo = useTerminalStore((s) => s.mesero);
  const bloquear = useTerminalStore((s) => s.bloquear);
  useAutoBloqueo();

  const usuario = useAuthStore((s) => s.usuario);
  const cajaAbierta = useAuthStore((s) => s.cajaAbierta);
  const puedeVerAdmin = useCan("reportes.ver");
  const puedeAbrirCaja = useCan("caja.abrir");
  const logout = useLogout();
  const navigate = useNavigate();

  function cerrarSesion() {
    logout.mutate(undefined, {
      onSettled: () => navigate("/", { replace: true }),
    });
  }

  return (
    <ContextoModoTema.Provider value="dark">
    <div data-mode="dark" className="min-h-screen bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-surface-1 px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {/* El sufijo "· Punto de venta" se cae en móvil: el contexto ya lo da la pantalla. */}
          <span className="truncate font-display text-lg">
            Bar POS<span className="hidden sm:inline"> · Punto de venta</span>
          </span>
          {cajaAbierta ? (
            <Badge variant="success">Caja abierta</Badge>
          ) : puedeAbrirCaja ? (
            <Link to="/app/caja">
              <Badge variant="danger">Caja cerrada</Badge>
            </Link>
          ) : (
            <Badge variant="danger">Caja cerrada</Badge>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          {pidePin ? (
            // Con terminal compartida, el nombre que importa es el de quien está
            // vendiendo, no el de la cuenta con la que se abrió la tablet.
            meseroActivo && (
              <Button variant="ghost" size="sm" onClick={bloquear} className="max-w-[9rem]">
                <Lock />
                <span className="truncate">{meseroActivo.nombre}</span>
              </Button>
            )
          ) : usuario ? (
            <span className="hidden text-sm text-text-secondary sm:inline">{usuario.nombre}</span>
          ) : null}
          {puedeVerAdmin && (
            <Link
              to="/app"
              className="inline-flex min-h-tap items-center gap-2 rounded px-2 text-sm text-text-secondary transition-colors hover:bg-surface-2 hover:text-foreground sm:min-h-0 sm:px-3 sm:py-2"
            >
              <LayoutGrid className="size-4 shrink-0" />
              <span className="hidden sm:inline">Administración</span>
              <span className="sr-only sm:hidden">Administración</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={cerrarSesion}
            disabled={logout.isPending}
          >
            <LogOut />
            <span className="hidden sm:inline">Cerrar sesión</span>
            <span className="sr-only sm:hidden">Cerrar sesión</span>
          </Button>
        </div>
      </header>

      <main className="p-3 sm:p-4">
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>

      {pidePin && !meseroActivo && <BloqueoTerminal />}
    </div>
    </ContextoModoTema.Provider>
  );
}
