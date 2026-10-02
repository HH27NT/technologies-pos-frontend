import { cn } from "@/lib/utils";

/** Una opción del filtro. `null` se reserva para la opción "sin filtro". */
export interface OpcionFiltro<T extends string | number | null> {
  valor: T;
  etiqueta: string;
}

interface FiltroPillsProps<T extends string | number | null> {
  /** Nombre accesible del grupo (no se pinta; lo lee el lector de pantalla). */
  etiqueta: string;
  opciones: OpcionFiltro<T>[];
  valor: T;
  onChange: (valor: T) => void;
}

/**
 * Filtro de una sola dimensión en forma de píldoras, con la opción "todas"
 * primero. Se usa para acotar una lista por una faceta corta (categorías).
 *
 * **Por qué píldoras y no pestañas:** semánticamente esto filtra una lista, no
 * cambia de vista; y con quince categorías una barra de pestañas se parte en
 * varios renglones en tablet. Por debajo de `md` el grupo scrollea en
 * horizontal —las píldoras no se encogen— y desde ahí acomoda en varias líneas,
 * que es donde sí hay ancho para leerlas todas de un golpe.
 *
 * El estado activo no se comunica solo con color: `aria-pressed` lo expone a la
 * tecnología asistiva y el relleno lleno lo separa del resto a simple vista.
 */
export function FiltroPills<T extends string | number | null>({
  etiqueta,
  opciones,
  valor,
  onChange,
}: FiltroPillsProps<T>) {
  return (
    <div
      role="group"
      aria-label={etiqueta}
      className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-x-visible md:pb-0"
    >
      {opciones.map((opcion) => {
        const activa = opcion.valor === valor;
        return (
          <button
            key={String(opcion.valor)}
            type="button"
            aria-pressed={activa}
            onClick={() => onChange(opcion.valor)}
            className={cn(
              // Alto táctil en pantallas de dedo; densidad de escritorio desde lg.
              "min-h-tap shrink-0 rounded-full border px-4 text-sm transition-colors lg:min-h-0 lg:px-3 lg:py-1.5",
              activa
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-text-secondary hover:bg-surface-2",
            )}
          >
            {opcion.etiqueta}
          </button>
        );
      })}
    </div>
  );
}
