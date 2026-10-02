import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  /** Título del vacío, en sentence case. */
  title: string;
  /** Texto que da dirección (invita a actuar), no una disculpa. */
  description?: string;
  /** Acción principal opcional (ej. "Crear el primero"). */
  action?: ReactNode;
  /** Icono opcional; por defecto una bandeja. */
  icon?: ReactNode;
}

/**
 * Estado vacío de una lista/tabla. El copy invita a actuar (regla de diseño):
 * "Aún no hay usuarios. Crea el primero." en vez de "No se encontró nada".
 */
export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed border-border bg-surface-1 px-6 py-12 text-center">
      <div className="mb-3 text-text-muted">{icon ?? <Inbox className="size-8" />}</div>
      <p className="font-display text-lg text-foreground">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-text-secondary">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
