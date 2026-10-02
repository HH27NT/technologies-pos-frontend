import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, ErrorState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCan } from "@/lib/auth";
import { formatMoney, formatDecimal } from "@/lib/format";
import { REPORTES, FORMATOS_EXPORT, PRESETS, type ReporteDef } from "../constants";
import { useReporte, useExportarReporte, descargarExportacion } from "../api";
import { RangoSelector } from "../components/RangoSelector";
import { ReporteResumen } from "../components/ReporteResumen";
import { ReporteChart } from "../components/ReporteChart";
import { ReporteTabla } from "../components/ReporteTabla";
import type { ExportacionResult } from "../types";

/**
 * Pantalla de Reportes y Dashboard (M16). Un selector de reporte (filtrado por
 * permiso: `reportes.ver` ve todo; `reportes.ver_limitado` no ve
 * inventario/cancelaciones/margen) + selector de rango. Muestra resumen, gráfica
 * (cuando aplica) y tabla, y permite exportar a PDF/Excel sin bloquear la UI.
 */
export function ReportesPage() {
  const puedeVerCompleto = useCan("reportes.ver");

  const disponibles = useMemo(
    () => REPORTES.filter((r) => !r.soloAdmin || puedeVerCompleto),
    [puedeVerCompleto],
  );

  // `tipo` y `preset` viven en la URL, no en estado local: así el dashboard puede
  // enlazar a un reporte concreto ya filtrado, la recarga no pierde el filtro y el
  // enlace se puede compartir.
  const [searchParams, setSearchParams] = useSearchParams();

  const tipo = searchParams.get("tipo") ?? "dashboard";
  // El preset SÍ se valida: ahora llega de una URL que cualquiera puede editar, y un
  // valor fuera del catálogo es un 422 del backend ("El periodo debe ser…").
  const preset = PRESETS.find((p) => p.value === searchParams.get("preset"))?.value ?? "hoy";

  const [exportando, setExportando] = useState<string | null>(null);

  // `replace` es deliberado: cambiar de reporte o de rango no debe apilar historial,
  // para que "atrás" regrese al dashboard y no al reporte anterior.
  const setParam = (clave: "tipo" | "preset", valor: string) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set(clave, valor);
        return next;
      },
      { replace: true },
    );

  // Si el reporte activo dejó de estar disponible (operador), vuelve al dashboard.
  const def: ReporteDef =
    disponibles.find((r) => r.tipo === tipo) ?? disponibles[0];

  const reporteQuery = useReporte(def.tipo, preset);
  const exportar = useExportarReporte();
  const data = reporteQuery.data;

  async function onExportar(formato: string) {
    setExportando(formato);
    exportar.mutate(
      { reporte: def.tipo, formato, preset },
      {
        onSuccess: async (res: ExportacionResult) => {
          try {
            await descargarExportacion(res.descarga_url, nombreArchivo(res));
            toast.success("Descarga lista");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "No se pudo descargar el archivo.");
          } finally {
            setExportando(null);
          }
        },
        onError: () => setExportando(null),
      },
    );
  }

  // Etiqueta y formato del eje Y de la gráfica (dinero o número).
  const chartInfo = useMemo(() => {
    if (!def.chart || !data || data.filas.length === 0) return null;
    const keys = Object.keys(data.filas[0]);
    const idx = keys.indexOf(def.chart.y);
    const etiqueta = idx >= 0 ? data.columnas[idx] : def.chart.y;
    const esMoney = def.money.includes(def.chart.y);
    const formato = (v: number) =>
      esMoney ? formatMoney(v) : formatDecimal(v, Number.isInteger(v) ? 0 : 2);
    return { etiqueta, formato };
  }, [def, data]);

  return (
    <>
      <PageHeader
        title="Reportes"
        description="Ventas, caja, medios de pago y más. Exporta a PDF o Excel."
      />

      {/* Selector de reporte */}
      <div className="mb-4 flex flex-wrap gap-1" role="tablist" aria-label="Tipo de reporte">
        {disponibles.map((r) => (
          <Button
            key={r.tipo}
            type="button"
            size="sm"
            role="tab"
            aria-selected={def.tipo === r.tipo}
            variant={def.tipo === r.tipo ? "default" : "ghost"}
            onClick={() => setParam("tipo", r.tipo)}
          >
            {r.label}
          </Button>
        ))}
      </div>

      {/* Controles: rango + exportar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <RangoSelector
          value={preset}
          onChange={(p) => setParam("preset", p)}
          disabled={reporteQuery.isFetching}
        />
        <div className="flex gap-2">
          {FORMATOS_EXPORT.map((f) => (
            <Button
              key={f.value}
              type="button"
              variant="outline"
              size="sm"
              disabled={exportando !== null || reporteQuery.isLoading}
              onClick={() => onExportar(f.value)}
            >
              {f.value === "pdf" ? <FileText /> : <Download />}
              {exportando === f.value ? "Generando…" : f.label}
            </Button>
          ))}
        </div>
      </div>

      <p className="mb-4 text-sm text-text-secondary">{def.descripcion}</p>

      {reporteQuery.isError ? (
        <ErrorState error={reporteQuery.error} onRetry={() => reporteQuery.refetch()} />
      ) : reporteQuery.isLoading ? (
        <Card className="grid min-h-[40vh] place-items-center p-6">
          <p className="text-text-secondary">Cargando reporte…</p>
        </Card>
      ) : data ? (
        <div className="space-y-6">
          <ReporteResumen resumen={data.resumen} def={def} />

          {def.chart && chartInfo && (
            <ReporteChart
              filas={data.filas}
              chart={def.chart}
              etiquetaValor={chartInfo.etiqueta}
              formatoValor={chartInfo.formato}
            />
          )}

          <ReporteTabla columnas={data.columnas} filas={data.filas} def={def} />
        </div>
      ) : null}
    </>
  );
}

/** Nombre de archivo amigable para la descarga (deriva la extensión del id_export). */
function nombreArchivo(res: ExportacionResult): string {
  const ext = res.id_export.includes(".")
    ? res.id_export.slice(res.id_export.lastIndexOf(".") + 1)
    : res.formato === "excel"
      ? "xlsx"
      : "pdf";
  return `reporte-${res.reporte}-${res.formato}.${ext}`;
}
