import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * Última red del árbol: envuelve al `RouterProvider`, así que atrapa lo que el
 * `errorElement` de las rutas NO puede — un fallo en los providers o en el arranque
 * del router, cuando todavía no hay contexto de navegación.
 *
 * Es de clase a propósito: React no ofrece boundaries en función, y aquí no se puede
 * depender de hooks del router porque el router es precisamente lo que pudo fallar.
 * Por eso la única salida es recargar; a este nivel no hay a dónde "volver".
 */

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundaryApp extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        role="alert"
        className="grid min-h-screen place-items-center bg-background px-6 text-foreground"
      >
        <div className="max-w-md text-center">
          <div className="mb-3 flex justify-center text-danger">
            <AlertTriangle className="size-8" />
          </div>
          <p className="font-display text-lg">No se pudo iniciar el sistema</p>
          <p className="mt-1 text-sm text-text-secondary">
            Recarga la página. Si vuelve a ocurrir, avisa a soporte con el detalle de abajo.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 min-h-tap rounded bg-primary px-4 font-display text-primary-foreground transition-colors hover:bg-brand-hover"
          >
            Recargar
          </button>
          {error.message && (
            <p className="mt-6 break-words font-mono text-xs text-text-muted">
              {error.message}
            </p>
          )}
        </div>
      </div>
    );
  }
}
