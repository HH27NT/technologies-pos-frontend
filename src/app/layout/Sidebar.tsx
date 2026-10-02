import { NavLink } from "react-router-dom";
import { Beer } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { navItems, GRUPOS_TENANT, type NavItem } from "./nav";

/**
 * Navegación de la app de administración.
 *
 * El mismo contenido se pinta de dos formas según el ancho: como barra lateral fija
 * a partir de `lg`, y dentro de un panel deslizante por debajo. La barra mide 224px,
 * que en un teléfono de 375px dejaría 150px de contenido, así que ahí no cabe fija.
 *
 * `SidebarContenido` es la única fuente del árbol de navegación; las dos envolturas
 * solo deciden dónde vive.
 */

/** Un ítem de navegación (presentacional; la visibilidad la decide el contenedor). */
function SidebarItem({ item, onNavegar }: { item: NavItem; onNavegar?: () => void }) {
  const Icono = item.icon;

  return (
    <NavLink
      to={item.to}
      end
      onClick={onNavegar}
      className={({ isActive }) =>
        cn(
          // min-h-tap: en el panel móvil estos enlaces se pulsan con el dedo.
          "flex min-h-tap items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm transition-colors lg:min-h-0",
          isActive
            ? "bg-surface-2 font-medium text-foreground"
            : "text-text-secondary hover:bg-surface-2 hover:text-foreground",
        )
      }
    >
      <Icono className="size-4 shrink-0 opacity-80" />
      {item.label}
    </NavLink>
  );
}

/** Encabezado de sección (se omite si la sección no lleva etiqueta, p. ej. Inicio). */
function SeccionNav({
  label,
  items,
  onNavegar,
}: {
  label?: string;
  items: NavItem[];
  onNavegar?: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <>
      {label && (
        <p className="px-2.5 pb-1 pt-3 text-2xs font-medium uppercase tracking-wider text-text-muted">
          {label}
        </p>
      )}
      {items.map((item) => (
        <SidebarItem key={item.to} item={item} onNavegar={onNavegar} />
      ))}
    </>
  );
}

/** Iniciales del nombre para el avatar del chip de usuario. */
function iniciales(nombre?: string | null): string {
  if (!nombre) return "?";
  const partes = nombre.trim().split(/\s+/).slice(0, 2);
  return partes.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

/** Marca + navegación por permisos + chip de usuario. Compartido por ambas envolturas. */
function SidebarContenido({ onNavegar }: { onNavegar?: () => void }) {
  const usuario = useAuthStore((s) => s.usuario);
  const esSuperAdmin = useAuthStore((s) => s.esSuperAdmin);
  const permisos = useAuthStore((s) => s.permisos);

  /** Visibilidad de un ítem según la sesión (regla de oro #3). */
  const visible = (item: NavItem): boolean => {
    if (esSuperAdmin) return item.superAdmin === true;
    if (!item.permiso) return true;
    const requeridos = Array.isArray(item.permiso) ? item.permiso : [item.permiso];
    return requeridos.some((p) => permisos.includes(p));
  };

  return (
    <>
      {/* Marca */}
      <div className="flex items-center gap-2 px-4 py-3.5">
        <span className="grid size-6 place-items-center rounded-md bg-primary text-primary-foreground">
          <Beer className="size-3.5" />
        </span>
        <span className="font-display text-md text-foreground">Bar POS</span>
      </div>

      {/* Navegación. Con muchos módulos y un teléfono en horizontal, la lista supera
          la altura disponible: se hace scrollable en vez de empujar el chip de usuario. */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2">
        {esSuperAdmin ? (
          // El super_admin ve una única sección de plataforma (sin split Negocio/Sistema).
          <SeccionNav label="Plataforma" items={navItems.filter(visible)} onNavegar={onNavegar} />
        ) : (
          GRUPOS_TENANT.map((grupo) => (
            <SeccionNav
              key={grupo.id}
              label={grupo.label}
              items={navItems.filter((i) => i.grupo === grupo.id && visible(i))}
              onNavegar={onNavegar}
            />
          ))
        )}
      </nav>

      {/* Chip de usuario */}
      <div className="mt-2 flex shrink-0 items-center gap-2.5 border-t border-border px-3 py-3">
        <span
          className="grid size-7 shrink-0 place-items-center rounded-full text-2xs font-semibold"
          style={{ backgroundColor: "var(--amber-900)", color: "#fff" }}
        >
          {iniciales(usuario?.nombre)}
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-sm text-foreground">{usuario?.nombre ?? "—"}</span>
          <span className="block truncate text-2xs text-text-muted">
            {esSuperAdmin ? "Plataforma" : (usuario?.rol ?? "Administración")}
          </span>
        </span>
      </div>
    </>
  );
}

/**
 * Barra lateral fija. Solo a partir de `lg`: por debajo no cabe.
 *
 * `sticky top-0 h-screen` la ata a la **pantalla**, no al documento. Como hija de un
 * flex con `min-h-screen`, se estiraba a lo alto de la página: en una lista larga la
 * navegación y el chip de cuenta se iban con el scroll y había que volver arriba para
 * saber con qué usuario se está trabajando. Ahora scrollea solo el contenido, y si la
 * propia navegación no cupiera, `overflow-y-auto` la desplaza por dentro sin empujar
 * el chip, que es `shrink-0`.
 */
export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-border bg-surface-1 lg:flex">
      <SidebarContenido />
    </aside>
  );
}

interface SidebarMovilProps {
  abierto: boolean;
  onAbiertoChange: (abierto: boolean) => void;
}

/**
 * La misma navegación en un panel deslizante, para anchos por debajo de `lg`.
 * Se cierra al elegir destino: dejarlo abierto taparía la pantalla recién cargada.
 */
export function SidebarMovil({ abierto, onAbiertoChange }: SidebarMovilProps) {
  return (
    <Sheet open={abierto} onOpenChange={onAbiertoChange}>
      <SheetContent side="left" titulo="Navegación" className="lg:hidden">
        <SidebarContenido onNavegar={() => onAbiertoChange(false)} />
      </SheetContent>
    </Sheet>
  );
}
