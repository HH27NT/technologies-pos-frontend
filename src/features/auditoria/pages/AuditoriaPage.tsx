import { useState } from "react";
import { PageHeader, ErrorState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useEstablecimientos } from "@/features/establecimientos";
import { useInsumos } from "@/features/insumos";
import { useProductos } from "@/features/productos";
import { useAuditoria } from "../api";
import { etiquetaEntidad, formatValorAuditoria } from "../formato";
import { ActividadFeed } from "../components/ActividadFeed";
import { AuditoriaFeed } from "../components/AuditoriaFeed";
import { AuditoriaDetalleDialog } from "../components/AuditoriaDetalleDialog";
import type { RegistroAuditoria } from "../types";

/** Nombre guardado en el snapshot del propio registro (`datos_despues`/`antes`). */
function nombreDeSnapshot(r: RegistroAuditoria): string | undefined {
  const fuente = r.datos_despues ?? r.datos_antes;
  if (fuente && typeof fuente === "object" && !Array.isArray(fuente)) {
    const nombre = (fuente as Record<string, unknown>).nombre;
    if (typeof nombre === "string" && nombre.trim()) return nombre;
  }
  return undefined;
}

/**
 * Pantalla de Auditoría (M15). Ledger de solo lectura, presentado como un feed de
 * actividad legible (icono + frase + tiempo relativo), no como tabla cruda. El admin
 * ve el del tenant (`/auditoria`); el super admin alterna entre la vista de
 * plataforma (eventos de establecimientos, con su nombre) y la global (todo).
 */
export function AuditoriaPage() {
  const esSuperAdmin = useAuthStore((s) => s.esSuperAdmin);
  const [page, setPage] = useState(1);
  const [detalle, setDetalle] = useState<RegistroAuditoria | undefined>();
  const [vista, setVista] = useState<"plataforma" | "global">("plataforma");

  const soloPlataforma = esSuperAdmin && vista === "plataforma";
  const auditoriaQuery = useAuditoria(
    soloPlataforma ? { page, entidad: "establecimientos" } : { page },
    esSuperAdmin,
  );

  // Nombres para el feed de "Plataforma": activar/desactivar no guardan el nombre
  // en su snapshot, así que se resuelven contra la lista de establecimientos.
  const establecimientos = useEstablecimientos({ per_page: 100 });
  const nombres = new Map(
    (establecimientos.data?.data ?? []).map((e) => [e.id, e.nombre] as const),
  );

  // Catálogo del tenant para mostrar el NOMBRE de insumos/productos en vez del id.
  // Solo el admin (el super_admin no tiene permiso de catálogo y cruzaría tenants).
  const insumosQuery = useInsumos({ per_page: 100 }, { enabled: !esSuperAdmin });
  const productosQuery = useProductos({ per_page: 100 }, { enabled: !esSuperAdmin });
  const nombresInsumos = new Map(
    (insumosQuery.data?.data ?? []).map((i) => [i.id, i.nombre] as const),
  );
  const nombresProductos = new Map(
    (productosQuery.data?.data ?? []).map((p) => [p.id, p.nombre] as const),
  );

  /** Etiqueta de la entidad: nombre para insumos/productos; si no, "Entidad #id". */
  function etiquetaDe(r: RegistroAuditoria): string {
    const base = etiquetaEntidad(r.entidad);
    if (r.entidad === "insumos" || r.entidad === "productos") {
      const mapa = r.entidad === "insumos" ? nombresInsumos : nombresProductos;
      const nombre =
        nombreDeSnapshot(r) ?? (r.entidad_id != null ? mapa.get(r.entidad_id) : undefined);
      if (nombre) return `${base} «${nombre}»`;
    }
    return `${base}${r.entidad_id != null ? ` #${r.entidad_id}` : ""}`;
  }

  /** Formatea un valor de snapshot resolviendo referencias id_insumo/id_producto a nombre. */
  function formatValorCampo(campo: string, valor: unknown): string {
    if (valor != null) {
      if (campo === "id_insumo") return nombresInsumos.get(Number(valor)) ?? `#${valor}`;
      if (campo === "id_producto") return nombresProductos.get(Number(valor)) ?? `#${valor}`;
      if (campo === "id_orden" || campo === "id_mesa") return `#${valor}`;
    }
    return formatValorAuditoria(valor);
  }

  function cambiarVista(nueva: "plataforma" | "global") {
    setVista(nueva);
    setPage(1);
  }

  const registros = auditoriaQuery.data?.data ?? [];
  const meta = auditoriaQuery.data?.meta;

  const descripcion = !esSuperAdmin
    ? "Registro de acciones sensibles del establecimiento."
    : vista === "plataforma"
      ? "Altas, activaciones y cambios de establecimientos hechos desde la plataforma."
      : "Registro global de acciones sensibles de todos los establecimientos.";

  const toggle = esSuperAdmin ? (
    <div className="inline-flex rounded-md border border-border bg-surface-1 p-0.5">
      {(["plataforma", "global"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => cambiarVista(v)}
          className={cn(
            "rounded px-3 py-1.5 text-sm font-medium transition-colors",
            vista === v
              ? "bg-surface-2 text-foreground"
              : "text-text-secondary hover:text-foreground",
          )}
        >
          {v === "plataforma" ? "Plataforma" : "Global"}
        </button>
      ))}
    </div>
  ) : undefined;

  if (auditoriaQuery.isError) {
    return (
      <>
        <PageHeader title="Auditoría" description={descripcion} actions={toggle} />
        <ErrorState error={auditoriaQuery.error} onRetry={() => auditoriaQuery.refetch()} />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Auditoría" description={descripcion} actions={toggle} />

      <div className="rounded-lg border border-border bg-card">
        {auditoriaQuery.isLoading ? (
          <p className="px-4 py-10 text-center text-sm text-text-muted">Cargando…</p>
        ) : registros.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-text-muted">
            {soloPlataforma
              ? "Sin actividad de plataforma."
              : "Aún no hay registros de auditoría."}
          </p>
        ) : soloPlataforma ? (
          <ActividadFeed registros={registros} nombres={nombres} />
        ) : (
          <AuditoriaFeed
            registros={registros}
            onSelect={setDetalle}
            etiquetaDe={etiquetaDe}
            mostrarEstablecimiento={esSuperAdmin}
          />
        )}

        {meta && meta.last_page > 1 && (
          <div className="flex flex-col gap-2 border-t border-border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="text-text-muted">
              Página {meta.current_page} de {meta.last_page}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.last_page}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>

      <AuditoriaDetalleDialog
        registro={detalle}
        entidadLabel={detalle ? etiquetaDe(detalle) : undefined}
        formatValor={formatValorCampo}
        onOpenChange={(o) => !o && setDetalle(undefined)}
      />
    </>
  );
}
