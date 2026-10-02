import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isApiError } from "@/lib/api/types";

interface ErrorStateProps {
  /** Error capturado (idealmente un ApiError con `message` en español). */
  error?: unknown;
  /** Callback para reintentar (ej. `refetch` de la query). */
  onRetry?: () => void;
  /** Título opcional; por defecto un mensaje neutro. */
  title?: string;
}

/**
 * Estado de error de carga. Muestra el `message` del backend tal cual (regla de
 * oro #2); si no es un ApiError, cae a un texto genérico. Ofrece reintentar.
 */
export function ErrorState({ error, onRetry, title = "No se pudo cargar" }: ErrorStateProps) {
  const mensaje = isApiError(error)
    ? error.message
    : "Ocurrió un error al obtener los datos.";

  return (
    <div className="grid place-items-center rounded-lg border border-danger-bg bg-danger-bg/40 px-6 py-12 text-center">
      <div className="mb-3 text-danger">
        <AlertTriangle className="size-8" />
      </div>
      <p className="font-display text-lg text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-text-secondary">{mensaje}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  );
}
