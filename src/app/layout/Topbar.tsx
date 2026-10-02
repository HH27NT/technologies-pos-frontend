import { useLocation, useNavigate } from "react-router-dom";
import { LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth";
import { useLogout } from "@/features/auth";
import { navItems } from "./nav";
import { SelectorTema } from "./SelectorTema";

/** Título de la sección actual, derivado de la ruta (para el breadcrumb). */
function useTituloSeccion(): string {
  const { pathname } = useLocation();
  // Coincidencia exacta primero; luego por prefijo (rutas con detalle).
  const exacto = navItems.find((i) => i.to === pathname);
  if (exacto) return exacto.label;
  const prefijo = navItems.find((i) => i.to !== "/app" && pathname.startsWith(i.to));
  return prefijo?.label ?? "Inicio";
}

interface TopbarProps {
  /** Abre el panel de navegación. Solo se usa por debajo de `lg`. */
  onAbrirMenu: () => void;
}

/**
 * Barra superior sobre el contenido: acceso a la navegación en móvil, contexto
 * (breadcrumb) y cierre de sesión.
 *
 * En pantallas angostas el espacio no alcanza para todo, así que se recorta por
 * prioridad: primero desaparece el nombre del usuario (ya está en el panel de
 * navegación), después el prefijo del breadcrumb, y el texto de "Cerrar sesión"
 * queda como icono — la acción sigue ahí, con su etiqueta accesible.
 */
export function Topbar({ onAbrirMenu }: TopbarProps) {
  const usuario = useAuthStore((s) => s.usuario);
  const esSuperAdmin = useAuthStore((s) => s.esSuperAdmin);
  const seccion = useTituloSeccion();
  const logout = useLogout();
  const navigate = useNavigate();

  function cerrarSesion() {
    // useLogout ya limpia la sesión en onSettled; aquí solo redirigimos al login.
    logout.mutate(undefined, {
      onSettled: () => navigate("/", { replace: true }),
    });
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-surface-1 px-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onAbrirMenu}
          className="-ml-1 grid size-10 shrink-0 place-items-center rounded-sm text-text-secondary transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
        >
          <Menu className="size-5" />
          <span className="sr-only">Abrir navegación</span>
        </button>

        <p className="min-w-0 truncate text-sm text-text-secondary">
          {/* El prefijo se cae primero: el nombre de la sección es lo que orienta. */}
          <span className="hidden sm:inline">
            {esSuperAdmin ? "Plataforma" : "Administración"}
            <span className="mx-1.5 text-text-muted">·</span>
          </span>
          <span className="font-medium text-foreground">{seccion}</span>
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-3">
        {usuario && (
          <span className="hidden text-sm text-text-secondary lg:inline">{usuario.nombre}</span>
        )}
        <SelectorTema />
        <Button variant="ghost" size="sm" onClick={cerrarSesion} disabled={logout.isPending}>
          <LogOut />
          <span className="hidden sm:inline">Cerrar sesión</span>
          <span className="sr-only sm:hidden">Cerrar sesión</span>
        </Button>
      </div>
    </header>
  );
}
