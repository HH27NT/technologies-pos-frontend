import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Wallet } from "lucide-react";
import { useAuthStore, useCan } from "@/lib/auth";
import { formatMoney, formatDecimal } from "@/lib/format";
import { useReporte } from "../../api";
import type { FilaReporte, ReporteData, ResumenReporte } from "../../types";
import { RangoSelector } from "../RangoSelector";
import { KpiTile } from "./KpiTile";
import { GraficaCard } from "./GraficaCard";
import { BarrasTiempo } from "./BarrasTiempo";
import { BarraHorizontal } from "./BarraHorizontal";
import { DonaMedios } from "./DonaMedios";

const money = (v: number) => formatMoney(v);
const num = (v: number) => formatDecimal(v, Number.isInteger(v) ? 0 : 2);
const n = (v: unknown) => Number(v ?? 0);

/**
 * La cifra de margen, o "—" cuando el backend la manda nula porque NINGÚN producto
 * del periodo tiene costo capturado. Sumar lo que se sabe de nada daría el ingreso
 * entero disfrazado de utilidad.
 */
function cifraDeMargen(resumen: ResumenReporte | undefined): string {
  return resumen?.margen == null ? "—" : money(n(resumen.margen));
}

/**
 * La pista bajo la cifra de margen. Cuando hay productos sin costo capturado, el
 * porcentaje **no se publica**: el backend lo manda nulo a propósito, porque un
 * "100.0% de utilidad" calculado sobre costos que nadie capturó es el cero con
 * confianza de siempre. En su lugar se dice qué falta, que es lo accionable.
 */
function pistaDeMargen(resumen: ResumenReporte | undefined): string | undefined {
  const sinCosto = n(resumen?.productos_sin_costo);
  if (sinCosto > 0) {
    const cuantos = sinCosto === 1 ? "1 producto" : `${sinCosto} productos`;
    // Sin ninguna cifra no hay utilidad que "salga alta": no hay con qué calcularla.
    return resumen?.margen == null
      ? `${cuantos} sin costo capturado: no hay con qué calcular la utilidad`
      : `${cuantos} sin costo capturado: la utilidad sale alta`;
  }
  if (resumen?.margen_pct == null) return undefined;
  return `${formatDecimal(n(resumen.margen_pct), 1)}% de utilidad`;
}

/**
 * Los rankings del dashboard son un vistazo, no el reporte: se recortan al top N.
 * Sin este tope el card crece sin techo — BarraHorizontal dimensiona su alto con
 * `filas.length * 34`, así que 60 productos producen un card de ~2000px que rompe
 * la fila de la rejilla. El detalle completo vive en /app/reportes.
 */
const TOP_RANKING = 5;
const top = (filas: FilaReporte[] | undefined) => (filas ?? []).slice(0, TOP_RANKING);

/** Fila de la sección `stock_bajo` del reporte de inventario (fuera de `filas`). */
interface StockBajoItem {
  insumo: string;
  stock_actual: number;
  stock_minimo: number | null;
  unidad: string;
}

/**
 * Dashboard de Inicio (M16) para admin y operador. El admin ve todo; el operador ve
 * solo lo operativo de SU turno (reportes.ver_limitado): KPIs, ventas y medios de pago.
 * Los widgets de gestión (margen, inventario, insumos, recetas) se gatean y sus queries
 * se difieren (`enabled`) para que el operador no dispare llamadas que responden 403.
 */
export function DashboardInicio() {
  const usuario = useAuthStore((s) => s.usuario);
  const cajaAbierta = useAuthStore((s) => s.cajaAbierta);
  const esAdmin = useCan("reportes.ver");
  const [preset, setPreset] = useState("mes");

  const dashboard = useReporte("dashboard", preset);
  const ventas = useReporte("ventas", preset);
  const medios = useReporte("medios-pago", preset);
  const ventasMensuales = useReporte("ventas-mensuales", "año");
  // Solo admin (reportes.ver): los demás endpoints responden 403 al operador.
  const margen = useReporte("margen", preset, esAdmin);
  const inventario = useReporte("inventario", preset, esAdmin);
  const consumo = useReporte("consumo-insumos", preset, esAdmin);
  const recetas = useReporte("top-recetas", "año", esAdmin);

  const productosSinCosto = n(margen.data?.resumen?.productos_sin_costo);
  /** Solo los productos cuyo margen se puede calcular: el resto no es una barra. */
  const conMargen = (margen.data?.filas ?? []).filter((f) => f.margen != null);
  const resumen = dashboard.data?.resumen;
  const ventasTotal = n(resumen?.ventas_total);
  const ordenesPagadas = n(resumen?.ordenes_pagadas);
  const ticketPromedio = ordenesPagadas > 0 ? ventasTotal / ordenesPagadas : 0;

  const stockBajo =
    (inventario.data as (ReporteData & { stock_bajo?: StockBajoItem[] }) | undefined)
      ?.stock_bajo ?? [];
  const stockBajoCount = n(inventario.data?.resumen?.stock_bajo);

  /**
   * URL del reporte completo detrás de cada gráfica. El rango por defecto es el del
   * dashboard, pero se pasa explícito donde la query NO usa `preset` (ventas-mensuales
   * y top-recetas piden "año"): si el enlace no espeja a su query, el usuario ve otros
   * datos de los que venía viendo. URLSearchParams se encarga de escapar "año".
   */
  const rutaReporte = (tipo: string, rango: string = preset) =>
    `/app/reportes?${new URLSearchParams({ tipo, preset: rango })}`;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-foreground">
            Hola{usuario ? `, ${usuario.nombre}` : ""}
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-text-secondary">
            <Wallet className="size-4" />
            {cajaAbierta ? (
              <span className="text-success">Caja abierta</span>
            ) : (
              <>
                Caja cerrada ·{" "}
                <Link to="/app/caja" className="text-brand-accent hover:underline">
                  abrir
                </Link>
              </>
            )}
          </p>
        </div>
        <RangoSelector value={preset} onChange={setPreset} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiTile label="Ventas del periodo" valor={money(ventasTotal)} cargando={dashboard.isLoading} />
        <KpiTile label="Órdenes pagadas" valor={num(ordenesPagadas)} cargando={dashboard.isLoading} />
        <KpiTile label="Ticket promedio" valor={money(ticketPromedio)} cargando={dashboard.isLoading} />
        <KpiTile
          label="Órdenes abiertas"
          valor={num(n(resumen?.ordenes_abiertas))}
          cargando={dashboard.isLoading}
        />
        {esAdmin && (
          <>
            <KpiTile
              label="Margen"
              valor={cifraDeMargen(margen.data?.resumen)}
              hint={pistaDeMargen(margen.data?.resumen)}
              // El verde celebra una utilidad medida. Si hay productos sin costo, la
              // cifra sale alta por falta de datos y no hay nada que celebrar.
              tono={productosSinCosto > 0 ? "default" : "success"}
              cargando={margen.isLoading}
            />
            <KpiTile
              label="Insumos en stock bajo"
              valor={num(stockBajoCount)}
              tono={stockBajoCount > 0 ? "danger" : "default"}
              cargando={inventario.isLoading}
            />
          </>
        )}
      </div>

      {/* Gráficas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <GraficaCard
          titulo="Ventas por día"
          subtitulo="Total cobrado por día en el periodo"
          verTodo={rutaReporte("ventas")}
          className="md:col-span-2 lg:col-span-2"
          cargando={ventas.isLoading}
          vacio={(ventas.data?.filas.length ?? 0) === 0}
        >
          <BarrasTiempo
            filas={ventas.data?.filas ?? []}
            x="fecha"
            y="total"
            etiquetaValor="Total"
            formato={money}
          />
        </GraficaCard>

        <GraficaCard
          titulo="Medios de pago"
          subtitulo="Monto cobrado por medio"
          verTodo={rutaReporte("medios-pago")}
          cargando={medios.isLoading}
          vacio={(medios.data?.filas.length ?? 0) === 0}
        >
          <DonaMedios
            filas={medios.data?.filas ?? []}
            nombreKey="medio"
            valorKey="monto"
            formato={money}
          />
        </GraficaCard>

        <GraficaCard
          titulo="Productos más vendidos"
          subtitulo={`Top ${TOP_RANKING} por unidades vendidas en el periodo`}
          verTodo={rutaReporte("dashboard")}
          cargando={dashboard.isLoading}
          vacio={(dashboard.data?.filas.length ?? 0) === 0}
        >
          <BarraHorizontal filas={top(dashboard.data?.filas)} x="producto" y="cantidad" formato={num} />
        </GraficaCard>

        {esAdmin && (
          <GraficaCard
            titulo="Productos más rentables"
            subtitulo={`Top ${TOP_RANKING} por margen (ingreso − costo)`}
            verTodo={rutaReporte("margen")}
            cargando={margen.isLoading}
            // Vacía también cuando hay productos pero ninguno tiene margen conocido:
            // si no, la tarjeta se quedaba en blanco sin decir por qué.
            vacio={conMargen.length === 0}
            vacioTexto={
              (margen.data?.filas.length ?? 0) > 0
                ? "Ningún producto vendido tiene costo capturado."
                : undefined
            }
          >
            <BarraHorizontal filas={top(conMargen)} x="producto" y="margen" formato={money} />
          </GraficaCard>
        )}

        {esAdmin && (
          <GraficaCard
            titulo="Insumos más utilizados"
            subtitulo={`Top ${TOP_RANKING} por cantidad consumida en el periodo`}
            verTodo={rutaReporte("consumo-insumos")}
            cargando={consumo.isLoading}
            vacio={(consumo.data?.filas.length ?? 0) === 0}
          >
            <BarraHorizontal
              filas={top(consumo.data?.filas)}
              x="insumo"
              y="cantidad"
              formato={num}
              sufijo={(f) => String(f.unidad ?? "")}
            />
          </GraficaCard>
        )}

        {esAdmin && (
          <GraficaCard
            titulo="Insumos en más recetas"
            subtitulo={`Top ${TOP_RANKING} por número de productos en que participa`}
            verTodo={rutaReporte("top-recetas", "año")}
            cargando={recetas.isLoading}
            vacio={(recetas.data?.filas.length ?? 0) === 0}
          >
            <BarraHorizontal filas={top(recetas.data?.filas)} x="insumo" y="recetas" formato={num} />
          </GraficaCard>
        )}

        <GraficaCard
          titulo="Ventas por mes"
          subtitulo="Tendencia del año"
          verTodo={rutaReporte("ventas-mensuales", "año")}
          className="md:col-span-2 lg:col-span-2"
          cargando={ventasMensuales.isLoading}
          vacio={(ventasMensuales.data?.filas.length ?? 0) === 0}
        >
          <BarrasTiempo
            filas={ventasMensuales.data?.filas ?? []}
            x="mes"
            y="total"
            etiquetaValor="Total"
            formato={money}
          />
        </GraficaCard>

        {esAdmin && (
          <GraficaCard
            titulo="Alertas de inventario"
            subtitulo="Insumos en o bajo su mínimo"
            verTodo={rutaReporte("inventario")}
            cargando={inventario.isLoading}
            vacio={stockBajo.length === 0}
            vacioTexto="Sin insumos en stock bajo. 👍"
          >
            <ul className="divide-y divide-border">
              {stockBajo.slice(0, 8).map((i) => (
                <li key={i.insumo} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <AlertTriangle className="size-4 shrink-0 text-danger" />
                    <span className="truncate text-foreground">{i.insumo}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-text-secondary">
                    {num(i.stock_actual)} / {i.stock_minimo != null ? num(i.stock_minimo) : "—"}{" "}
                    {i.unidad}
                  </span>
                </li>
              ))}
            </ul>
          </GraficaCard>
        )}
      </div>
    </div>
  );
}
