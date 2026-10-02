import { lazy } from "react";

/**
 * Páginas de módulo cargadas con `React.lazy` (code-splitting por ruta, Fase 10).
 * Viven aparte del router para no mezclar definiciones de componente con el export
 * del `router` (regla react-refresh). Cada `import()` genera un chunk propio; las
 * features exportan con nombre, de ahí el `.then(m => ({ default: m.X }))`.
 */

export const UsuariosPage = lazy(() =>
  import("@/features/usuarios").then((m) => ({ default: m.UsuariosPage })),
);
export const RolesPage = lazy(() =>
  import("@/features/roles").then((m) => ({ default: m.RolesPage })),
);
export const CategoriasPage = lazy(() =>
  import("@/features/categorias").then((m) => ({ default: m.CategoriasPage })),
);
export const ProductosPage = lazy(() =>
  import("@/features/productos").then((m) => ({ default: m.ProductosPage })),
);
export const CargarMenuPage = lazy(() =>
  import("@/features/productos").then((m) => ({ default: m.CargarMenuPage })),
);
export const MesasPage = lazy(() =>
  import("@/features/mesas").then((m) => ({ default: m.MesasPage })),
);
export const ProveedoresPage = lazy(() =>
  import("@/features/proveedores").then((m) => ({ default: m.ProveedoresPage })),
);
export const UnidadesPage = lazy(() =>
  import("@/features/unidades").then((m) => ({ default: m.UnidadesPage })),
);
export const InsumosPage = lazy(() =>
  import("@/features/insumos").then((m) => ({ default: m.InsumosPage })),
);
export const RecetasPage = lazy(() =>
  import("@/features/recetas").then((m) => ({ default: m.RecetasPage })),
);
export const CajaPage = lazy(() =>
  import("@/features/caja").then((m) => ({ default: m.CajaPage })),
);
export const ImpresorasPage = lazy(() =>
  import("@/features/impresoras").then((m) => ({ default: m.ImpresorasPage })),
);
export const EstablecimientosPage = lazy(() =>
  import("@/features/establecimientos").then((m) => ({ default: m.EstablecimientosPage })),
);
export const ConfiguracionPage = lazy(() =>
  import("@/features/configuracion").then((m) => ({ default: m.ConfiguracionPage })),
);
export const AuditoriaPage = lazy(() =>
  import("@/features/auditoria").then((m) => ({ default: m.AuditoriaPage })),
);
export const ReportesPage = lazy(() =>
  import("@/features/reportes").then((m) => ({ default: m.ReportesPage })),
);
export const AutorizacionesPage = lazy(() =>
  import("@/features/autorizaciones").then((m) => ({ default: m.AutorizacionesPage })),
);
export const MiPinPage = lazy(() =>
  import("@/features/autorizaciones").then((m) => ({ default: m.MiPinPage })),
);
export const PosPage = lazy(() =>
  import("@/features/ordenes").then((m) => ({ default: m.PosPage })),
);
export const PosOrdenPage = lazy(() =>
  import("@/features/ordenes").then((m) => ({ default: m.PosOrdenPage })),
);
