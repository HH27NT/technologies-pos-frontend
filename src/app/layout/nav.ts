/**
 * Configuración de navegación de la app protegida. Cada módulo se agrega aquí con
 * su permiso y su GRUPO; la barra lateral oculta los ítems que el usuario no puede
 * ver (regla de oro #3) y agrupa el resto en secciones (Negocio / Sistema).
 *
 * A medida que se construyan los módulos se van sumando entradas con su ruta,
 * permiso y grupo correspondiente.
 */
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ScrollText,
  Building2,
  ShoppingCart,
  Wallet,
  ShieldCheck,
  KeyRound,
  Tags,
  Package,
  Armchair,
  Boxes,
  NotebookText,
  Truck,
  Scale,
  Printer,
  BarChart3,
  Users,
  ShieldUser,
  Settings,
} from "lucide-react";
import { PERMISOS_AUTORIZADOR } from "@/features/autorizaciones/permisos";

/**
 * Grupos de la barra lateral (tenant):
 *  - `inicio`   — el dashboard; sin encabezado, siempre arriba.
 *  - `negocio`  — operación diaria, catálogo, inventario y dispositivos.
 *  - `sistema`  — gobernanza: personal, autorizaciones, auditoría, configuración.
 *  - `plataforma` — solo super_admin (se pinta como una única sección aparte).
 */
export type GrupoNav = "inicio" | "negocio" | "sistema" | "plataforma";

export interface NavItem {
  label: string;
  to: string;
  /** Icono lucide del ítem (se pinta en la barra lateral). */
  icon: LucideIcon;
  /** Grupo al que pertenece (define bajo qué encabezado se lista). */
  grupo: GrupoNav;
  /** Permiso requerido. Un arreglo significa "al menos uno" (OR). */
  permiso?: string | string[];
  /** Oculta el ítem al super admin (pantallas que exigen membresía con un tenant). */
  excluirSuperAdmin?: boolean;
  /** Muestra el item solo al super admin (Modulos de plataforma). Lista blanca */
  superAdmin?: boolean;
}

/** Orden y etiqueta de las secciones para un usuario de tenant. `inicio` no lleva encabezado. */
export const GRUPOS_TENANT: { id: GrupoNav; label?: string }[] = [
  { id: "inicio" },
  { id: "negocio", label: "Negocio" },
  { id: "sistema", label: "Sistema" },
];

export const navItems: NavItem[] = [
  // `permiso` gatea el LINK (regla de oro #3); `AppHome` hace el mismo chequeo por
  // ruta directa. Exclusivo del dueño (`reportes.ver_dashboard`): ni el gerente lo ve.
  {
    label: "Inicio",
    to: "/app",
    icon: LayoutDashboard,
    grupo: "inicio",
    permiso: "reportes.ver_dashboard",
    superAdmin: true,
  },

  // --- Negocio: operación, catálogo, inventario, dispositivos ---
  { label: "Punto de venta", to: "/pos", icon: ShoppingCart, grupo: "negocio", permiso: "ordenes.crear" },
  { label: "Caja", to: "/app/caja", icon: Wallet, grupo: "negocio", permiso: "caja.abrir" },
  { label: "Mesas", to: "/app/mesas", icon: Armchair, grupo: "negocio", permiso: "mesas.gestionar" },
  { label: "Categorías", to: "/app/categorias", icon: Tags, grupo: "negocio", permiso: "categorias.gestionar" },
  { label: "Productos", to: "/app/productos", icon: Package, grupo: "negocio", permiso: "productos.gestionar" },
  { label: "Recetas", to: "/app/recetas", icon: NotebookText, grupo: "negocio", permiso: "recetas.gestionar" },
  { label: "Insumos", to: "/app/insumos", icon: Boxes, grupo: "negocio", permiso: "insumos.gestionar" },
  { label: "Unidades", to: "/app/unidades", icon: Scale, grupo: "negocio", permiso: "unidades.gestionar" },
  { label: "Impresoras", to: "/app/impresoras", icon: Printer, grupo: "negocio", permiso: "impresoras.gestionar" },
  // Espeja el guard del router: admin (`reportes.ver`) u operador (`reportes.ver_limitado`),
  // que ve el mismo catálogo con su alcance recortado por el backend. El super admin no tiene
  // tenant. Sin esta entrada la pantalla existía pero no había cómo llegar salvo tecleando la URL.
  {
    label: "Reportes",
    to: "/app/reportes",
    icon: BarChart3,
    grupo: "negocio",
    permiso: ["reportes.ver", "reportes.ver_limitado"],
    excluirSuperAdmin: true,
  },

  // --- Sistema: gobernanza y administración ---
  {
    label: "Proveedores",
    to: "/app/proveedores",
    icon: Truck,
    grupo: "sistema",
    permiso: "proveedores.gestionar",
  },
  { label: "Usuarios", to: "/app/usuarios", icon: Users, grupo: "sistema", permiso: "usuarios.gestionar" },
  {
    label: "Roles",
    to: "/app/roles",
    icon: ShieldUser,
    grupo: "sistema",
    permiso: "roles.gestionar",
    excluirSuperAdmin: true,
  },
  {
    label: "Autorizaciones",
    to: "/app/autorizaciones",
    icon: ShieldCheck,
    grupo: "sistema",
    permiso: "autorizaciones.aprobar",
  },
  {
    label: "PIN de autorización",
    to: "/app/mi-pin",
    icon: KeyRound,
    grupo: "sistema",
    permiso: PERMISOS_AUTORIZADOR,
    excluirSuperAdmin: true,
  },
  {
    label: "Auditoría",
    to: "/app/auditoria",
    icon: ScrollText,
    grupo: "sistema",
    permiso: ["auditoria.ver", "auditoria.global"],
    superAdmin: true,
  },
  {
    label: "Configuración",
    to: "/app/configuracion",
    icon: Settings,
    grupo: "sistema",
    permiso: "configuracion.editar",
    excluirSuperAdmin: true,
  },

  // --- Plataforma: solo super_admin ---
  {
    label: "Establecimientos",
    to: "/app/establecimientos",
    icon: Building2,
    grupo: "plataforma",
    permiso: "establecimientos.gestionar",
    superAdmin: true,
  },
];
