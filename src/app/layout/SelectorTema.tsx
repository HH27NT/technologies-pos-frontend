import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFijarPreferenciaTema, usePreferenciaTema, type PreferenciaTema } from "@/lib/tema";

/**
 * Selector de tema de la administración (claro / oscuro / el del sistema).
 *
 * Vive en la topbar y **solo aparece en administración**: el POS es oscuro por diseño, no por
 * preferencia (ver `lib/tema`). Se eligió un menú de tres opciones y no un interruptor de dos
 * porque "seguir al sistema" es un estado propio: quien alterna claro/oscuro con la hora del
 * día quiere que la app lo siga sola, y un interruptor lo obligaría a decidir dos veces.
 */

const OPCIONES: { valor: PreferenciaTema; etiqueta: string; Icono: typeof Sun }[] = [
  { valor: "claro", etiqueta: "Claro", Icono: Sun },
  { valor: "oscuro", etiqueta: "Oscuro", Icono: Moon },
  { valor: "sistema", etiqueta: "El del sistema", Icono: Monitor },
];

export function SelectorTema() {
  const preferencia = usePreferenciaTema();
  const setPreferencia = useFijarPreferenciaTema();

  const actual = OPCIONES.find((o) => o.valor === preferencia) ?? OPCIONES[0];
  const IconoActual = actual.Icono;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`Tema: ${actual.etiqueta}`}>
          <IconoActual />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        {OPCIONES.map(({ valor, etiqueta, Icono }) => (
          <DropdownMenuItem
            key={valor}
            onSelect={() => setPreferencia(valor)}
            // La opción activa se marca con `aria-checked` además del color: en un menú de
            // tres, "cuál está puesto" no puede quedar solo en un matiz de fondo.
            role="menuitemradio"
            aria-checked={valor === preferencia}
            className={valor === preferencia ? "text-brand-accent" : undefined}
          >
            <Icono />
            {etiqueta}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
