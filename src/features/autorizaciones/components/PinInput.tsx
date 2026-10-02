import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PinInputProps {
  value: string;
  onChange: (pin: string) => void;
  onBlur?: () => void;
  name?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  placeholder?: string;
  "aria-label"?: string;
}

/**
 * Campo de PIN de autorización: 6 dígitos, enmascarado y numérico, con botón
 * mostrar/ocultar (ojito) para que quien teclea pueda verificar lo que escribió.
 *
 * `inputMode="numeric"` abre el teclado numérico en la tablet del POS, y el onChange
 * filtra todo lo que no sea dígito (así el pegado de "48-29-13" o un teclado con
 * acentos no ensucia el valor). `autoComplete="off"` evita que el gestor de
 * contraseñas del navegador ofrezca guardarlo: el PIN es de un solo uso y no debe
 * quedar en ningún almacén del cliente. Arranca oculto (enmascarado).
 */
export const PinInput = forwardRef<HTMLInputElement, PinInputProps>(function PinInput(
  { value, onChange, onBlur, name, autoFocus, disabled, placeholder = "••••••", ...rest },
  ref,
) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        ref={ref}
        name={name}
        type={visible ? "text" : "password"}
        inputMode="numeric"
        autoComplete="off"
        maxLength={6}
        autoFocus={autoFocus}
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        className={cn(
          "text-center font-display text-2xl tracking-[0.5em] tabular-nums",
          "min-h-tap px-11",
        )}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        disabled={disabled}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center text-text-muted transition-colors hover:text-foreground disabled:opacity-50"
        aria-label={visible ? "Ocultar PIN" : "Mostrar PIN"}
        tabIndex={-1}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
});
