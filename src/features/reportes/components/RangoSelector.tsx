import { Button } from "@/components/ui/button";
import { PRESETS } from "../constants";

interface RangoSelectorProps {
  value: string;
  onChange: (preset: string) => void;
  disabled?: boolean;
}

/**
 * Selector de rango por preset (hoy | semana | mes | año). Valores confirmados
 * contra el backend; el rango exacto lo resuelve el backend a partir del preset.
 */
export function RangoSelector({ value, onChange, disabled }: RangoSelectorProps) {
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Periodo del reporte">
      {PRESETS.map((p) => (
        <Button
          key={p.value}
          type="button"
          size="sm"
          variant={value === p.value ? "default" : "outline"}
          aria-pressed={value === p.value}
          disabled={disabled}
          onClick={() => onChange(p.value)}
        >
          {p.label}
        </Button>
      ))}
    </div>
  );
}
