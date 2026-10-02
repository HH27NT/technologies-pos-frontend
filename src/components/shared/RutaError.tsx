import { AlertTriangle } from "lucide-react";
import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { isApiError } from "@/lib/api/types";

/**
 * Pantalla de error de ruta (`errorElement`). Cubre lo que el manejo de datos NO
 * cubre: errores de render, chunks que no cargan y fallos de arranque. Los errores
 * de una query siguen siendo de `ErrorState` — no se mezclan.
 *
 * Se monta DENTRO del layout (ver `router.tsx`: cuelga de una ruta intermedia sin
 * `path`, no de la ruta del layout), así el chrome sobrevive: en el POS el operador
 * conserva el encabezado con el estado de caja y su salida de sesión, y vuelve a la
 * lista de órdenes sin recargar ni volver a iniciar sesión.
 */

interface RutaErrorProps {
  /** A dónde vuelve el usuario. En el POS jamás se le manda a administración. */
  alcance?: "app" | "pos";
  /** Pantalla completa (raíz del router, sin layout alrededor). */
  pantallaCompleta?: boolean;
}

/**
 * Un chunk que no carga casi siempre significa despliegue nuevo: el `index.html` en
 * memoria apunta a archivos que ya no existen. No es un bug de la pantalla y se
 * resuelve recargando, así que merece su propio copy.
 */
function esChunkNoCargado(error: unknown): boolean {
  const mensaje = error instanceof Error ? error.message : String(error ?? "");
  return /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(
    mensaje,
  );
}

/** Texto para el usuario. Los mensajes del backend se muestran tal cual (regla #2). */
function describir(error: unknown): { titulo: string; detalle: string } {
  if (esChunkNoCargado(error)) {
    return {
      titulo: "Hay una versión nueva del sistema",
      detalle: "Recarga para continuar; no se pierde nada de lo que ya guardaste.",
    };
  }
  if (isApiError(error)) {
    return { titulo: "No se pudo completar la operación", detalle: error.message };
  }
  if (isRouteErrorResponse(error)) {
    return {
      titulo: "Esta pantalla no está disponible",
      detalle: error.statusText || `Error ${error.status}.`,
    };
  }
  return {
    titulo: "Algo falló en esta pantalla",
    detalle: "El resto del sistema sigue funcionando. Vuelve e inténtalo de nuevo.",
  };
}

export function RutaError({ alcance = "app", pantallaCompleta = false }: RutaErrorProps) {
  const error = useRouteError();
  const navigate = useNavigate();
  const { titulo, detalle } = describir(error);
  const chunk = esChunkNoCargado(error);

  const destino = alcance === "pos" ? "/pos" : "/app";
  const etiquetaVolver = alcance === "pos" ? "Volver al punto de venta" : "Volver al inicio";

  // Navegar remonta la ruta y descarta este boundary: recuperación sin recargar, que
  // en el POS conserva sesión y estado de caja. Recargar queda como salida secundaria
  // (y como la principal cuando el problema es un chunk viejo).
  // Táctil en el POS (48px), compacto en administración: el mismo criterio de densidad
  // que el resto de cada layout.
  const tamañoBoton = alcance === "pos" ? "tap" : "sm";

  const contenido = (
    <div
      role="alert"
      className="mx-auto grid max-w-lg place-items-center rounded-lg border border-danger/30 bg-danger-bg px-6 py-12 text-center"
    >
      <div className="mb-3 text-danger">
        <AlertTriangle className="size-8" />
      </div>
      <p className="font-display text-lg text-foreground">{titulo}</p>
      <p className="mt-1 max-w-sm text-sm text-text-secondary">{detalle}</p>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {chunk ? (
          <Button size={tamañoBoton} onClick={() => window.location.reload()}>
            Recargar
          </Button>
        ) : (
          <>
            <Button
              size={tamañoBoton}
              onClick={() => navigate(destino, { replace: true })}
            >
              {etiquetaVolver}
            </Button>
            <Button
              variant="outline"
              size={tamañoBoton}
              onClick={() => window.location.reload()}
            >
              Recargar
            </Button>
          </>
        )}
      </div>

      {/* Para soporte: identifica el fallo sin obligar a nadie a abrir la consola. */}
      {error instanceof Error && error.message && (
        <details className="mt-6 max-w-md text-left">
          <summary className="cursor-pointer text-xs text-text-muted">
            Detalle técnico
          </summary>
          <p className="mt-2 break-words font-mono text-xs text-text-muted">
            {error.message}
          </p>
        </details>
      )}
    </div>
  );

  if (!pantallaCompleta) return contenido;

  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 text-foreground">
      <div className="w-full max-w-lg">{contenido}</div>
    </div>
  );
}
