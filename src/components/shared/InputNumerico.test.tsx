import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InputNumerico } from "./InputNumerico";

/**
 * Regresiones del campo numérico. Cada caso de aquí se rompió alguna vez en un
 * formulario real: el `0100` que no se limpiaba, el `12.50` que se capturaba como
 * `1250` y el `NaN` que aparecía al teclear una letra.
 */

function Campo({
  decimales = 2,
  inicial = undefined as number | null | undefined,
  vacio = undefined as null | undefined,
}) {
  const [valor, setValor] = useState<number | null | undefined>(inicial);
  return (
    <>
      <label htmlFor="monto">Monto</label>
      <InputNumerico
        id="monto"
        decimales={decimales}
        vacio={vacio}
        value={valor}
        onChange={setValor}
      />
      <span data-testid="valor">{String(valor)}</span>
    </>
  );
}

function campo() {
  return screen.getByLabelText("Monto") as HTMLInputElement;
}

function valorEmitido() {
  return screen.getByTestId("valor").textContent;
}

describe("InputNumerico", () => {
  it("conserva los decimales mientras se escriben", async () => {
    const user = userEvent.setup();
    render(<Campo inicial={0} />);
    const input = campo();

    await user.clear(input);
    await user.type(input, "12.50");

    expect(input.value).toBe("12.50");
    expect(valorEmitido()).toBe("12.5");
  });

  it("no deja el cero pegado al escribir encima", async () => {
    const user = userEvent.setup();
    render(<Campo inicial={0} decimales={0} />);
    const input = campo();

    // Sin seleccionar: el caret queda al final del `0` y se teclea a continuación.
    input.focus();
    input.setSelectionRange(1, 1);
    await user.keyboard("100");

    expect(input.value).toBe("100");
    expect(valorEmitido()).toBe("100");
  });

  it("selecciona el cero al entrar al campo", async () => {
    const user = userEvent.setup();
    render(<Campo inicial={0} />);
    const input = campo();

    await user.click(input);
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(1);

    await user.keyboard("5");
    expect(input.value).toBe("5");
  });

  it("ignora letras y signos en vez de producir NaN", async () => {
    const user = userEvent.setup();
    render(<Campo inicial={0} />);
    const input = campo();

    await user.clear(input);
    await user.type(input, "12");
    await user.type(input, "abc-e");

    expect(input.value).toBe("12");
    expect(valorEmitido()).toBe("12");
  });

  it("ignora un pegado que no es un número", async () => {
    const user = userEvent.setup();
    render(<Campo inicial={0} />);
    const input = campo();

    await user.clear(input);
    await user.type(input, "45");
    await user.paste("hola");

    expect(input.value).toBe("45");
    expect(valorEmitido()).toBe("45");
  });

  it("respeta el caret al borrar en medio de la cifra", async () => {
    const user = userEvent.setup();
    render(<Campo inicial={0} decimales={0} />);
    const input = campo();

    await user.clear(input);
    await user.type(input, "1234");
    input.setSelectionRange(2, 2);
    await user.keyboard("{Backspace}");

    expect(input.value).toBe("134");
    expect(input.selectionStart).toBe(1);

    // La segunda tecla borra el dígito de la izquierda, no el del final.
    await user.keyboard("{Backspace}");
    expect(input.value).toBe("34");
  });

  it("emite el valor vacío al dejar el campo en blanco", async () => {
    const user = userEvent.setup();
    render(<Campo inicial={7} />);
    const input = campo();

    await user.clear(input);

    expect(input.value).toBe("");
    expect(valorEmitido()).toBe("undefined");
  });

  it("emite null cuando el campo lo pide", async () => {
    const user = userEvent.setup();
    render(<Campo inicial={7} vacio={null} />);

    await user.clear(campo());

    expect(valorEmitido()).toBe("null");
  });

  it("rechaza el punto en un campo entero", async () => {
    const user = userEvent.setup();
    render(<Campo inicial={undefined} decimales={0} />);
    const input = campo();

    await user.type(input, "3.5");

    expect(input.value).toBe("35");
  });

  it("no admite más decimales de los permitidos", async () => {
    const user = userEvent.setup();
    render(<Campo inicial={undefined} decimales={2} />);
    const input = campo();

    await user.type(input, "1.239");

    expect(input.value).toBe("1.23");
  });

  it("acepta la coma del teclado numérico como punto", async () => {
    const user = userEvent.setup();
    render(<Campo inicial={undefined} />);
    const input = campo();

    await user.type(input, "8,5");

    expect(input.value).toBe("8.5");
    expect(valorEmitido()).toBe("8.5");
  });

  it("se repinta cuando el valor cambia desde afuera", async () => {
    const user = userEvent.setup();

    function ConBoton() {
      const [valor, setValor] = useState<number | null | undefined>(undefined);
      return (
        <>
          <label htmlFor="monto">Monto</label>
          <InputNumerico id="monto" decimales={2} value={valor} onChange={setValor} />
          <button type="button" onClick={() => setValor(150.75)}>
            Saldo exacto
          </button>
        </>
      );
    }

    render(<ConBoton />);
    await user.type(campo(), "20");
    await user.click(screen.getByRole("button", { name: "Saldo exacto" }));

    expect(campo().value).toBe("150.75");
  });
});
