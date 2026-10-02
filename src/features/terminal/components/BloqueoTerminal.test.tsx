import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { apiError, limpiarSesion, renderConProviders } from "@/test/utils";
import { BloqueoTerminal } from "./BloqueoTerminal";
import { useTerminalStore, tokenMeseroVigente } from "../store";

/**
 * Pantalla de bloqueo de la terminal compartida. Lo que se protege aquí:
 *  - el PIN se envía solo al completar 6 dígitos (y una sola vez);
 *  - un PIN inválido muestra el mensaje del backend y limpia el teclado;
 *  - identificarse guarda el token de firma, que caduca por reloj.
 */

const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }));

vi.mock("@/lib/api/client", () => ({ client: { post: postMock } }));

const MESERO = { id: 7, nombre: "Mesero1", token: "tok-abc", bloqueo_segundos: 300 };

function teclear(user: ReturnType<typeof userEvent.setup>, digitos: string) {
  return digitos.split("").reduce(
    (previo, d) => previo.then(() => user.click(screen.getByRole("button", { name: d }))),
    Promise.resolve(),
  );
}

afterEach(() => {
  postMock.mockReset();
  useTerminalStore.getState().bloquear();
  limpiarSesion();
});

describe("BloqueoTerminal", () => {
  it("no envía nada hasta completar los 6 dígitos", async () => {
    renderConProviders(
      <MemoryRouter>
        <BloqueoTerminal />
      </MemoryRouter>,
    );
    const user = userEvent.setup();

    await teclear(user, "48291");

    expect(postMock).not.toHaveBeenCalled();
  });

  it("al sexto dígito identifica al mesero y guarda su token", async () => {
    postMock.mockResolvedValue(MESERO);
    renderConProviders(
      <MemoryRouter>
        <BloqueoTerminal />
      </MemoryRouter>,
    );
    const user = userEvent.setup();

    await teclear(user, "482913");

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith("/terminal/identificar", { pin: "482913" }),
    );
    expect(postMock).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(useTerminalStore.getState().mesero?.nombre).toBe("Mesero1"));
    expect(tokenMeseroVigente()).toBe("tok-abc");
  });

  it("un PIN inválido muestra el mensaje del backend y no deja mesero activo", async () => {
    postMock.mockRejectedValue(apiError(422, "PIN inválido."));
    renderConProviders(
      <MemoryRouter>
        <BloqueoTerminal />
      </MemoryRouter>,
    );
    const user = userEvent.setup();

    await teclear(user, "111111");

    expect(await screen.findByRole("alert")).toHaveTextContent("PIN inválido.");
    expect(useTerminalStore.getState().mesero).toBeNull();
  });

  it("el token deja de valer cuando caduca, aunque siga en el store", async () => {
    useTerminalStore.getState().identificar({ ...MESERO, bloqueo_segundos: -1 });

    expect(useTerminalStore.getState().mesero?.nombre).toBe("Mesero1");
    // Vencido: nada que firmar. Sin esto mandaríamos un token muerto y la orden se
    // guardaría sin firma, en silencio.
    expect(tokenMeseroVigente()).toBeUndefined();
  });
});
