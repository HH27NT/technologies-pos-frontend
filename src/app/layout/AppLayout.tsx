import { Suspense, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { ContextoModoTema, useModoAdministracion } from "@/lib/tema";
import { Topbar } from "./Topbar";
import { Sidebar, SidebarMovil } from "./Sidebar";
import { RouteFallback } from "./RouteFallback";

/**
 * Shell de la app protegida (tema claro / administración).
 *
 * A partir de `lg` la barra lateral es fija a la izquierda; por debajo vive en un
 * panel deslizante que abre la topbar, porque sus 224px no caben en un teléfono.
 * El POS de escritura usa su propio layout oscuro (data-mode="dark").
 */
export function AppLayout() {
  // El tema de administración es preferencia del usuario (claro / oscuro / el del sistema); el
  // POS no, es oscuro por diseño. Se estampa en el contenedor y se propaga por contexto para
  // que los diálogos y menús, que se montan en un portal fuera de aquí, no se queden en claro.
  const modo = useModoAdministracion();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const { pathname } = useLocation();

  // Al navegar (incluido el botón atrás del navegador, que no pasa por los enlaces
  // del panel) el panel debe cerrarse, o taparía la pantalla recién cargada.
  const [rutaPrevia, setRutaPrevia] = useState(pathname);
  if (rutaPrevia !== pathname) {
    setRutaPrevia(pathname);
    if (menuAbierto) setMenuAbierto(false);
  }

  return (
    <ContextoModoTema.Provider value={modo}>
      <div data-mode={modo} className="flex min-h-screen bg-background text-foreground">
        <Sidebar />
        <SidebarMovil abierto={menuAbierto} onAbiertoChange={setMenuAbierto} />

        {/* min-w-0: sin esto un hijo ancho (una tabla) estira el flex y desborda la
            página en horizontal en vez de hacer scroll dentro de su propio contenedor. */}
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Topbar onAbrirMenu={() => setMenuAbierto(true)} />
          <main className="flex-1 p-4 sm:p-6">
            <div className="mx-auto max-w-6xl">
              <Suspense fallback={<RouteFallback />}>
                <Outlet />
              </Suspense>
            </div>
          </main>
        </div>
      </div>
    </ContextoModoTema.Provider>
  );
}
