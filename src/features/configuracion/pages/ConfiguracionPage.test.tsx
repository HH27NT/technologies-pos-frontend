import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { limpiarSesion, renderConProviders } from "@/test/utils";
import { ConfiguracionPage } from "./ConfiguracionPage";
import type { ConfiguracionRecurso } from "../types";

/**
 * Configuración del establecimiento (M03). Lo que se protege aquí es el interruptor
 * de terminal compartida (PIN de mesero):
 *  - el auto-bloqueo solo existe cuando el modo está encendido;
 *  - el modo viaja en el PUT junto al resto de la configuración;
 *  - sin `configuracion.editar` la pantalla es de solo lectura.
 */

const { getMock, putMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  putMock: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  client: { get: getMock, put: putMock },
}));

const CONFIG_BASE: ConfiguracionRecurso = {
  id: 1,
  nombre_comercial: "Bar Demo",
  telefono_ticket: null,
  direccion_ticket: null,
  impresion_automatica: false,
  terminal_compartida: false,
  bloqueo_terminal_segundos: 120,
  stock_minimo_global: null,
  aplica_impuesto: false,
  tasa_impuesto: null,
};

function montar(
  config: Partial<ConfiguracionRecurso> = {},
  permisos: string[] = ["configuracion.editar"],
) {
  getMock.mockResolvedValue({ ...CONFIG_BASE, ...config });
  renderConProviders(<ConfiguracionPage />, { permisos });
  return userEvent.setup();
}

const interruptor = () => screen.getByRole("switch", { name: /pedir pin de mesero/i });
const bloqueo = () => screen.queryByLabelText(/bloqueo por inactividad/i);

afterEach(() => {
  getMock.mockReset();
  putMock.mockReset();
  limpiarSesion();
});

describe("ConfiguracionPage · terminal compartida", () => {
  it("con el modo apagado no muestra el auto-bloqueo", async () => {
    montar();

    await waitFor(() => expect(interruptor()).not.toBeChecked());
    expect(bloqueo()).not.toBeInTheDocument();
  });

  it("con el modo encendido muestra el auto-bloqueo con su valor actual", async () => {
    montar({ terminal_compartida: true, bloqueo_terminal_segundos: 300 });

    await waitFor(() => expect(interruptor()).toBeChecked());
    expect(bloqueo()).toHaveValue("300");
  });

  it("al encender el modo aparece el auto-bloqueo y se guarda con el resto", async () => {
    const user = montar();
    putMock.mockResolvedValue({ ...CONFIG_BASE, terminal_compartida: true });
    await waitFor(() => expect(interruptor()).not.toBeChecked());

    await user.click(interruptor());
    expect(bloqueo()).toHaveValue("120");

    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    await waitFor(() =>
      expect(putMock).toHaveBeenCalledWith(
        "/configuracion",
        expect.objectContaining({
          terminal_compartida: true,
          bloqueo_terminal_segundos: 120,
        }),
      ),
    );
  });

  it("rechaza en local un bloqueo por debajo del mínimo, sin llamar al backend", async () => {
    const user = montar({ terminal_compartida: true });
    await waitFor(() => expect(interruptor()).toBeChecked());

    // `fireEvent.change` y no `user.type`: en jsdom, limpiar un input numérico no
    // funciona y el valor tecleado se concatenaría al que ya tenía.
    fireEvent.change(bloqueo()!, { target: { value: "5" } });
    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    expect(await screen.findByText(/mínimo 30 segundos/i)).toBeInTheDocument();
    expect(putMock).not.toHaveBeenCalled();
  });

  it("sin permiso de edición el interruptor queda deshabilitado y no hay botón de guardar", async () => {
    montar({ terminal_compartida: true }, []);

    // El interruptor nace deshabilitado; hay que esperar a que llegue la config
    // para que el auto-bloqueo esté en pantalla.
    await waitFor(() => expect(interruptor()).toBeChecked());
    expect(interruptor()).toBeDisabled();
    expect(bloqueo()).toBeDisabled();
    expect(screen.queryByRole("button", { name: /guardar cambios/i })).not.toBeInTheDocument();
  });
});
