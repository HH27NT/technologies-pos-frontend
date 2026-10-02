import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ScrollText } from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { useEstablecimientos } from "@/features/establecimientos";
import { useAuditoria } from "@/features/auditoria/api";
import { ActividadFeed } from "@/features/auditoria/components/ActividadFeed";
import { ErrorState, EstadoPill } from "@/components/shared";
import { formatFecha } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Panel de inicio del super admin (plataforma). Resume los establecimientos que
 * administra y la actividad global reciente. Solo usa datos que el backend ya
 * expone: la lista de `/establecimientos` (total/activos/nuevos por `created_at`)
 * y el ledger de `/auditoria/global`.
 *
 * NOTA: los conteos activos/inactivos/nuevos se calculan sobre la página cargada.
 * Cuando la plataforma crezca conviene mover la agregación a un endpoint
 * `/plataforma/resumen` en el backend (ver docs de reestructuración).
 */

const MS_30_DIAS = 30 * 24 * 60 * 60 * 1000;

export function PanelPlataforma() {
  const nombre = useAuthStore((s) => s.usuario?.nombre);
  const establecimientos = useEstablecimientos({ per_page: 100 });
  // Solo eventos de plataforma (creación/activación/… de establecimientos), no el
  // ruido operativo del POS. El backend filtra por `entidad` (AuditoriaController).
  const auditoria = useAuditoria({ entidad: "establecimientos", per_page: 8 }, true);
  // "Ahora" capturado una sola vez al montar: Date.now() es impuro y no debe
  // llamarse en cada render (lo exige el React Compiler). Para un dashboard, el
  // instante de carga es suficiente para el corte de "nuevos". Va con los demás
  // hooks, antes de cualquier return condicional (reglas de los hooks).
  const [limite] = useState(() => Date.now() - MS_30_DIAS);

  if (establecimientos.isError) {
    return (
      <ErrorState error={establecimientos.error} onRetry={() => establecimientos.refetch()} />
    );
  }

  const lista = establecimientos.data?.data ?? [];
  const total = establecimientos.data?.meta.total ?? lista.length;
  const activos = lista.filter((e) => e.activo).length;
  const inactivos = lista.filter((e) => !e.activo).length;
  const nuevos = lista.filter((e) => new Date(e.created_at).getTime() >= limite).length;

  const recientes = [...lista]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // Índice id → nombre: la auditoría de activar/desactivar no guarda el nombre en
  // su snapshot (solo `activo`), así que lo resolvemos contra la lista ya cargada.
  const nombrePorId = new Map(lista.map((e) => [e.id, e.nombre] as const));

  const cargando = establecimientos.isLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-foreground">
          Hola{nombre ? `, ${nombre}` : ""}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Resumen de la plataforma
          {!cargando && (
            <>
              {" — "}
              {total} {total === 1 ? "establecimiento" : "establecimientos"}
              {inactivos > 0 && `, ${inactivos} inactivo${inactivos === 1 ? "" : "s"}`}.
            </>
          )}
        </p>
      </div>

      {/* Tiles de resumen */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Total de establecimientos" valor={total} sub="En toda la plataforma"
          color="info" cargando={cargando} />
        <Tile label="Activos" valor={activos} sub="Operando" color="success" cargando={cargando} />
        <Tile label="Inactivos" valor={inactivos} sub="Desactivados" color="danger"
          resaltar={inactivos > 0} cargando={cargando} />
        <Tile label="Nuevos (30 días)" valor={nuevos} sub="Altas recientes" color="brand"
          cargando={cargando} />
      </div>

      {/* Cuerpo en dos columnas */}
      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr] lg:items-start">
        {/* Establecimientos recientes */}
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="font-display text-md text-foreground">Establecimientos recientes</h2>
            <Link to="/app/establecimientos" className="text-sm text-brand-accent hover:underline">
              Ver todos →
            </Link>
          </div>
          {cargando ? (
            <SkeletonFilas />
          ) : recientes.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-text-muted">
              Aún no hay establecimientos. Crea el primero.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {recientes.map((e) => {
                const esNuevo = new Date(e.created_at).getTime() >= limite;
                return (
                  <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{e.nombre}</p>
                      <p className="text-xs text-text-muted">
                        {e.direccion ?? "Sin dirección"} · alta {formatFecha(e.created_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {esNuevo && <EstadoPill tono="nuevo">Nuevo</EstadoPill>}
                      {e.activo ? (
                        <EstadoPill tono="activo">Activo</EstadoPill>
                      ) : (
                        <EstadoPill tono="inactivo">Inactivo</EstadoPill>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Acciones + actividad */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 font-display text-md text-foreground">Acciones</h2>
            <div className="flex flex-col gap-2">
              <Link
                to="/app/establecimientos"
                className="flex items-center gap-2 rounded-sm bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-brand-hover"
              >
                <Plus className="size-4" /> Crear establecimiento
              </Link>
              <Link
                to="/app/auditoria"
                className="flex items-center gap-2 rounded-sm border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-2"
              >
                <ScrollText className="size-4" /> Ver auditoría global
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="font-display text-md text-foreground">Actividad reciente</h2>
              <Link to="/app/auditoria" className="text-sm text-brand-accent hover:underline">
                Auditoría →
              </Link>
            </div>
            {auditoria.isLoading ? (
              <SkeletonFilas />
            ) : auditoria.isError ? (
              <p className="px-4 py-6 text-center text-sm text-text-muted">
                No se pudo cargar la actividad.
              </p>
            ) : (auditoria.data?.data.length ?? 0) === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-text-muted">
                Sin actividad de plataforma reciente.
              </p>
            ) : (
              <ActividadFeed registros={auditoria.data?.data ?? []} nombres={nombrePorId} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Subcomponentes presentacionales ----------------------------------------

const TONO_TILE: Record<string, string> = {
  success: "bg-success",
  danger: "bg-danger",
  brand: "bg-primary",
  info: "bg-info",
};

function Tile({
  label,
  valor,
  sub,
  color,
  resaltar,
  cargando,
}: {
  label: string;
  valor: number;
  sub: string;
  color: keyof typeof TONO_TILE | string;
  resaltar?: boolean;
  cargando?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border bg-card p-4",
        resaltar ? "border-danger/40" : "border-border",
      )}
    >
      <span className={cn("absolute inset-y-3 left-0 w-[3px] rounded", TONO_TILE[color] ?? "bg-info")} />
      <div className="pl-2">
        <p className="text-xs text-text-muted">{label}</p>
        <p className="mt-1.5 font-display text-2xl tabular-nums text-foreground">
          {cargando ? "—" : valor}
        </p>
        <p className="mt-1 text-2xs text-text-muted">{sub}</p>
      </div>
    </div>
  );
}

function SkeletonFilas() {
  return (
    <ul className="divide-y divide-border">
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex items-center gap-3 px-4 py-3.5">
          <div className="h-3 w-2/3 animate-pulse rounded bg-surface-2" />
        </li>
      ))}
    </ul>
  );
}
