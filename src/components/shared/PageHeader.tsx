import type { ReactNode } from "react";

interface PageHeaderProps {
  /** Título de la pantalla, en sentence case. */
  title: string;
  /** Descripción breve opcional bajo el título. */
  description?: string;
  /** Acciones a la derecha (ej. botón "Nuevo…", gateado por permiso). */
  actions?: ReactNode;
}

/**
 * Encabezado de pantalla de administración: título + descripción + acciones.
 * Las acciones se pasan ya gateadas por permiso desde la página.
 */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-xl text-foreground sm:text-2xl">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-text-secondary">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
