import { createBrowserRouter } from "react-router-dom";
import { RequireAuth, RequirePermission } from "@/lib/auth";
import { RutaError } from "@/components/shared";
import { LoginPage } from "@/features/auth";
// Constante (no componente): se importa del módulo hoja para no arrastrar el barrel
// de autorizaciones —con sus páginas— al bundle principal.
import { PERMISOS_AUTORIZADOR } from "@/features/autorizaciones/permisos";
import { RootBoot } from "./RootBoot";
import { AppLayout } from "./layout/AppLayout";
import { PosLayout } from "./layout/PosLayout";
import { AppHome } from "./pages/AppHome";
import { NotFound } from "./pages/NotFound";
// Páginas con code-splitting por ruta (Fase 10, pulido): cada una viaja en su
// propio chunk (incl. la dependencia pesada Recharts en Reportes) y no infla el
// bundle inicial. El <Suspense> vive en los layouts para conservar el chrome
// (Topbar/Sidebar) mientras el chunk de la pantalla se descarga.
import {
  UsuariosPage,
  RolesPage,
  CategoriasPage,
  ProductosPage,
  CargarMenuPage,
  MesasPage,
  ProveedoresPage,
  UnidadesPage,
  InsumosPage,
  RecetasPage,
  CajaPage,
  ImpresorasPage,
  EstablecimientosPage,
  ConfiguracionPage,
  AuditoriaPage,
  ReportesPage,
  AutorizacionesPage,
  MiPinPage,
  PosPage,
  PosOrdenPage,
} from "./lazyPages";

export const router = createBrowserRouter([
  {
    element: <RootBoot />,
    // Red de seguridad de la raíz: atrapa lo que se escape de los boundaries de cada
    // layout, incluidos los fallos del layout mismo. Sin layout alrededor → a pantalla
    // completa. Los boundaries de abajo son los que conservan el chrome.
    errorElement: <RutaError pantallaCompleta />,
    children: [
      { path: "/", element: <LoginPage /> },
      {
        // Todo lo de aquí abajo exige sesión y se pinta dentro del shell (AppLayout).
        element: <RequireAuth />,
        children: [
          {
            element: <AppLayout />,
            children: [
              {
                // Ruta intermedia sin `path` (renderiza el Outlet): su `errorElement`
                // se pinta DENTRO del AppLayout. Colgarlo de la ruta del layout
                // sustituiría el layout entero y perdería sidebar y topbar.
                errorElement: <RutaError alcance="app" />,
                children: [
                { path: "/app", element: <AppHome /> },
                {
                  // Reportes (M16): admin (`reportes.ver`) o operador
                  // (`reportes.ver_limitado`). El super admin no tiene tenant → excluido.
                  element: (
                    <RequirePermission
                      perm={["reportes.ver", "reportes.ver_limitado"]}
                      excluirSuperAdmin
                    />
                  ),
                  children: [{ path: "/app/reportes", element: <ReportesPage /> }],
                },
                {
                  // Solo quien tenga usuarios.gestionar. Es un módulo de tenant: el
                  // super admin no pertenece a uno → excluido (evita el 403 del backend).
                  element: <RequirePermission perm="usuarios.gestionar" excluirSuperAdmin />,
                  children: [{ path: "/app/usuarios", element: <UsuariosPage /> }],
                },
                {
                  // Editor de roles a medida (M04): `roles.gestionar`, solo admin — quien
                  // define permisos puede fabricarse autoridad, así que el gerente no entra.
                  element: <RequirePermission perm="roles.gestionar" excluirSuperAdmin />,
                  children: [{ path: "/app/roles", element: <RolesPage /> }],
                },
                {
                  element: <RequirePermission perm="categorias.gestionar" excluirSuperAdmin />,
                  children: [{ path: "/app/categorias", element: <CategoriasPage /> }],
                },
                {
                  element: <RequirePermission perm="productos.gestionar" excluirSuperAdmin />,
                  children: [
                    { path: "/app/productos", element: <ProductosPage /> },
                    { path: "/app/productos/cargar", element: <CargarMenuPage /> },
                  ],
                },
                {
                  element: <RequirePermission perm="mesas.gestionar" excluirSuperAdmin />,
                  children: [{ path: "/app/mesas", element: <MesasPage /> }],
                },
                {
                  element: <RequirePermission perm="proveedores.gestionar" excluirSuperAdmin />,
                  children: [{ path: "/app/proveedores", element: <ProveedoresPage /> }],
                },
                {
                  element: <RequirePermission perm="unidades.gestionar" excluirSuperAdmin />,
                  children: [{ path: "/app/unidades", element: <UnidadesPage /> }],
                },
                {
                  element: <RequirePermission perm="insumos.gestionar" excluirSuperAdmin />,
                  children: [{ path: "/app/insumos", element: <InsumosPage /> }],
                },
                {
                  element: <RequirePermission perm="recetas.gestionar" excluirSuperAdmin />,
                  children: [{ path: "/app/recetas", element: <RecetasPage /> }],
                },
                {
                  element: <RequirePermission perm="impresoras.gestionar" excluirSuperAdmin />,
                  children: [{ path: "/app/impresoras", element: <ImpresorasPage /> }],
                },
                {
                  element: <RequirePermission perm="autorizaciones.aprobar" excluirSuperAdmin />,
                  children: [{ path: "/app/autorizaciones", element: <AutorizacionesPage /> }],
                },
                {
                  // PIN propio (M14.1): solo quien puede autorizar algo. El super admin
                  // queda fuera: no pertenece a ningún establecimiento y el backend le
                  // responde 403 en /mi-pin.
                  element: (
                    <RequirePermission perm={PERMISOS_AUTORIZADOR} excluirSuperAdmin />
                  ),
                  children: [{ path: "/app/mi-pin", element: <MiPinPage /> }],
                },
                {
                  // Caja: operador y admin tienen caja.abrir/cerrar; con abrir basta
                  // para ver la pantalla (los botones se gatean por su permiso exacto).
                  element: <RequirePermission perm="caja.abrir" excluirSuperAdmin />,
                  children: [{ path: "/app/caja", element: <CajaPage /> }],
                },
                {
                  // Plataforma (M02): CRUD de establecimientos. Solo super_admin
                  // (el admin de un tenant no tiene `establecimientos.gestionar`).
                  element: <RequirePermission perm="establecimientos.gestionar" />,
                  children: [
                    { path: "/app/establecimientos", element: <EstablecimientosPage /> },
                  ],
                },
                {
                  // Configuración (M03): del tenant. El super admin no tiene tenant,
                  // así que se le excluye (el backend le responde 403).
                  element: (
                    <RequirePermission perm="configuracion.editar" excluirSuperAdmin />
                  ),
                  children: [{ path: "/app/configuracion", element: <ConfiguracionPage /> }],
                },
                {
                  // Auditoría (M15): admin ve el ledger del tenant (`auditoria.ver`);
                  // super_admin ve el global (`auditoria.global`). La página elige el
                  // endpoint según el rol.
                  element: (
                    <RequirePermission perm={["auditoria.ver", "auditoria.global"]} />
                  ),
                  children: [{ path: "/app/auditoria", element: <AuditoriaPage /> }],
                },
                ],
              },
            ],
          },
          {
            // POS (M11): layout oscuro propio, fuera del shell de administración.
            // La entrada exige `ordenes.crear` (operador y admin la tienen); las
            // escrituras se deshabilitan sin caja abierta dentro de las pantallas.
            // El super admin no vende (no tiene tenant) → excluido.
            element: <RequirePermission perm="ordenes.crear" excluirSuperAdmin />,
            children: [
              {
                element: <PosLayout />,
                children: [
                  {
                    // El boundary vive DENTRO del shell oscuro: si una pantalla del POS
                    // truena, el operador conserva encabezado, estado de caja y salida de
                    // sesión, y vuelve a la lista de órdenes sin recargar ni reautenticarse.
                    errorElement: <RutaError alcance="pos" />,
                    children: [
                      { path: "/pos", element: <PosPage /> },
                      { path: "/pos/ordenes/:id", element: <PosOrdenPage /> },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
