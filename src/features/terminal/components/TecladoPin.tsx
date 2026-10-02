import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

interface TecladoPinProps {
  /** PIN tecleado hasta ahora (0–6 dígitos). */
  valor: string;
  onChange: (pin: string) => void;
  disabled?: boolean;
}

const TECLAS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
const LARGO = 6;

/**
 * Teclado numérico grande para teclear el PIN en la tablet de la barra.
 *
 * Teclado propio y no un `<input type="number">` porque en una terminal compartida
 * hay que dar de frente a un dedo, no a un cursor: objetivos de 48 px (`min-h-tap`),
 * sin depender del teclado del sistema operativo (que en modo quiosco puede no salir)
 * y sin que el navegador ofrezca autocompletar un secreto.
 *
 * Los dígitos se muestran como puntos: quien teclea está de cara al público.
 */
export function TecladoPin({ valor, onChange, disabled }: TecladoPinProps) {
  function pulsar(digito: string) {
    if (disabled || valor.length >= LARGO) return;
    onChange(valor + digito);
  }

  function borrar() {
    if (disabled) return;
    onChange(valor.slice(0, -1));
  }

  return (
    <div className="w-full max-w-xs">
      <div
        className="flex justify-center gap-3"
        role="status"
        aria-label={`${valor.length} de ${LARGO} dígitos`}
      >
        {Array.from({ length: LARGO }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "size-3.5 rounded-full transition-colors",
              i < valor.length ? "bg-primary" : "bg-surface-2 ring-1 ring-border",
            )}
          />
        ))}
      </div>

      <div className="mt-8 grid grid-cols-3 gap-3">
        {TECLAS.map((t) => (
          <TeclaNumero key={t} digito={t} onPulsar={pulsar} disabled={disabled} />
        ))}
        <span />
        <TeclaNumero digito="0" onPulsar={pulsar} disabled={disabled} />
        <button
          type="button"
          onClick={borrar}
          disabled={disabled || valor.length === 0}
          aria-label="Borrar"
          className="grid h-16 place-items-center rounded-xl border border-border text-text-secondary transition-colors hover:bg-surface-2 active:bg-surface-2 disabled:opacity-40"
        >
          <Delete className="size-6" />
        </button>
      </div>
    </div>
  );
}

interface TeclaNumeroProps {
  digito: string;
  onPulsar: (digito: string) => void;
  disabled?: boolean;
}

function TeclaNumero({ digito, onPulsar, disabled }: TeclaNumeroProps) {
  return (
    <button
      type="button"
      onClick={() => onPulsar(digito)}
      disabled={disabled}
      className="h-16 rounded-xl border border-border bg-surface-1 font-display text-2xl tabular-nums transition-colors hover:bg-surface-2 active:bg-surface-2 disabled:opacity-40"
    >
      {digito}
    </button>
  );
}
