import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Input para capturar números (dinero, cantidades, enteros).
 *
 * Existe porque un `<input type="number">` controlado por React se queda pegado:
 * React compara el valor del DOM con el de props usando igualdad **débil**, así que
 * con `"0100" != 100` → `false` nunca reescribe el DOM y el `0100` sigue pintado
 * aunque el estado ya valga `100`. Y un `<input type="text">` que hace `Number(...)`
 * en cada tecla es peor: `Number("12.")` es `12`, el punto desaparece y `12.50`
 * termina capturado como `1250`; cualquier letra o pegado produce `NaN`.
 *
 * La solución es que el input mantenga **su propio texto**: `"12."` es un estado
 * legítimo mientras se escribe aunque todavía no exista como número. Hacia afuera
 * solo sale el número ya parseado, nunca `NaN`.
 *
 * No admite negativos: ningún campo del POS los captura (los ajustes de inventario
 * eligen el tipo de movimiento, no el signo).
 */

const SOLO_DIGITOS = /^\d*$/;
const CON_PUNTO = /^\d*(?:\.\d*)?$/;

/** ¿El texto es una cifra válida (o una cifra a medio escribir, como `"12."`)? */
function esCifra(texto: string, decimales: number) {
  if (decimales === 0) return SOLO_DIGITOS.test(texto);
  if (!CON_PUNTO.test(texto)) return false;
  const punto = texto.indexOf(".");
  return punto === -1 || texto.length - punto - 1 <= decimales;
}

/** Texto con el que se pinta un valor que viene de afuera (reset, rehidratación). */
function aTexto(valor: number | null | undefined) {
  return valor === null || valor === undefined || Number.isNaN(valor) ? "" : String(valor);
}

/** Número que representa un texto ya saneado. `""` y `"."` no son número todavía. */
function aNumero(texto: string) {
  if (texto === "" || texto === ".") return undefined;
  return Number(texto);
}

export interface InputNumericoProps
  extends Omit<
    React.ComponentProps<typeof Input>,
    "value" | "onChange" | "type" | "inputMode" | "min" | "max" | "step"
  > {
  /** Valor controlado. `null` o `undefined` pintan el campo vacío. */
  value: number | null | undefined;
  /** Recibe el número tecleado, o `vacio` cuando el campo se queda en blanco. */
  onChange: (valor: number | null | undefined) => void;
  /** Decimales admitidos: `0` entero, `2` dinero, `3` cantidades de insumo. */
  decimales: number;
  /** Qué emitir con el campo vacío: `undefined` (por omisión) o `null` si el backend lo distingue. */
  vacio?: null | undefined;
}

export const InputNumerico = React.forwardRef<HTMLInputElement, InputNumericoProps>(
  function InputNumerico(
    { value, onChange, decimales, vacio, className, onFocus, onClick, ...props },
    ref,
  ) {
    const [texto, setTexto] = React.useState(() => aTexto(value));

    // El texto manda mientras se escribe; el valor de afuera solo se impone cuando
    // dejó de corresponder (form.reset, rehidratar al editar, "saldo exacto").
    const valorExterno =
      value === null || value === undefined || Number.isNaN(value) ? undefined : value;
    const mostrado = aNumero(texto) === valorExterno ? texto : aTexto(valorExterno);

    function alCambiar(e: React.ChangeEvent<HTMLInputElement>) {
      const campo = e.currentTarget;
      // La coma del teclado numérico vale como punto; los ceros a la izquierda se
      // van (ese es el `0100` original).
      const tecleado = campo.value.replace(",", ".").replace(/^0+(?=\d)/, "");

      if (!esCifra(tecleado, decimales)) {
        // Se rechaza la tecla (o el pegado) sin tocar el estado, así que hay que
        // devolver el DOM a mano: sin cambio de estado React no vuelve a pintar.
        const sobra = campo.value.length - mostrado.length;
        const caret = Math.max(0, (campo.selectionStart ?? mostrado.length) - sobra);
        campo.value = mostrado;
        campo.setSelectionRange(caret, caret);
        return;
      }

      setTexto(tecleado);
      onChange(aNumero(tecleado) ?? vacio);
    }

    /** Con el campo en cero, entrar a él selecciona todo para escribir encima. */
    function seleccionarSiEsCero(campo: HTMLInputElement) {
      if (aNumero(campo.value) === 0) campo.select();
    }

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode={decimales > 0 ? "decimal" : "numeric"}
        autoComplete="off"
        className={cn("tabular-nums", className)}
        value={mostrado}
        onChange={alCambiar}
        // En Chrome el `mouseup` colapsa la selección hecha en el `focus`, así que
        // hay que repetirla en el clic o entrar con mouse no selecciona nada.
        onFocus={(e) => {
          seleccionarSiEsCero(e.currentTarget);
          onFocus?.(e);
        }}
        onClick={(e) => {
          seleccionarSiEsCero(e.currentTarget);
          onClick?.(e);
        }}
      />
    );
  },
);
