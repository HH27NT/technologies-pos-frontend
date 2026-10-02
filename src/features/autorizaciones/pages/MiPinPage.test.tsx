import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { apiError, limpiarSesion, renderConProviders } from "@/test/utils";
import { MiPinPage } from "./MiPinPage";
import type { EstadoPin } from "../types";

/**
 * Pantalla self-service del PIN (M14.1). Lo que se protege aquí:
 *  - el PIN nunca se muestra: la pantalla solo refleja si está configurado;
 *  - los PIN triviales se cortan en local, sin viajar;
 *  - el 422 del backend aterriza INLINE en el campo que lo causó;
 *  - fijar el PIN exige la contraseña de acceso actual.
 */

const { getMock, putMock, deleteMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  putMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  client: { get: getMock, put: putMock, delete: deleteMock },
}));

const SIN_CONFIGURAR: EstadoPin = { configurado: false, actualizado_at: null };
const CONFIGURADO: EstadoPin = {
  configurado: true,
  actualizado_at: "2026-07-13T18:20:00Z",
};

function montar(estado: EstadoPin = SIN_CONFIGURAR) {
  getMock.mockResolvedValue(estado);
  renderConProviders(<MiPinPage />, { permisos: ["ordenes.anular"] });
  return userEvent.setup();
}

const pinNuevo = () => screen.getByLabelText("PIN nuevo");
const repetirPin = () => screen.getByLabelText("Repetir PIN");
const password = () => screen.getByLabelText("Tu contraseña actual");
const guardar = () => screen.getByRole("button", { name: /establecer pin|cambiar pin/i });

afterEach(() => {
  getMock.mockReset();
  putMock.mockReset();
  deleteMock.mockReset();
  limpiarSesion();
});

describe("MiPinPage", () => {
  it("sin PIN configurado invita a establecerlo y no ofrece eliminarlo", async () => {
    montar(SIN_CONFIGURAR);

    expect(await screen.findByText("Sin configurar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /establecer pin/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /eliminar/i })).not.toBeInTheDocument();
  });

  it("con PIN configurado muestra el estado y desde cuándo, nunca el PIN", async () => {
    montar(CONFIGURADO);

    expect(await screen.findByText("PIN configurado")).toBeInTheDocument();
    expect(screen.getByText(/actualizado el/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cambiar pin/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /eliminar/i })).toBeInTheDocument();
    // Los campos son de PIN nuevo: la pantalla no puede revelar el vigente.
    expect(pinNuevo()).toHaveValue("");
  });

  it("corta los PIN triviales en local, sin llamar al backend", async () => {
    const user = montar();
    await screen.findByText("Sin configurar");

    await user.type(pinNuevo(), "111111");
    await user.type(repetirPin(), "111111");
    await user.type(password(), "password");
    await user.click(guardar());

    expect(await screen.findByText(/demasiado predecible/i)).toBeInTheDocument();
    expect(putMock).not.toHaveBeenCalled();
  });

  it("exige que la confirmación coincida", async () => {
    const user = montar();
    await screen.findByText("Sin configurar");

    await user.type(pinNuevo(), "482913");
    await user.type(repetirPin(), "482914");
    await user.type(password(), "password");
    await user.click(guardar());

    expect(await screen.findByText(/no coincide/i)).toBeInTheDocument();
    expect(putMock).not.toHaveBeenCalled();
  });

  it("guarda el PIN con la contraseña actual y limpia los campos", async () => {
    const user = montar();
    putMock.mockResolvedValue(CONFIGURADO);
    await screen.findByText("Sin configurar");

    await user.type(pinNuevo(), "482913");
    await user.type(repetirPin(), "482913");
    await user.type(password(), "password");
    await user.click(guardar());

    await waitFor(() =>
      expect(putMock).toHaveBeenCalledWith("/mi-pin", {
        pin: "482913",
        pin_confirmation: "482913",
        password_actual: "password",
      }),
    );
    // El estado se refresca y los campos quedan vacíos: nada de PIN en pantalla.
    expect(await screen.findByText("PIN configurado")).toBeInTheDocument();
    await waitFor(() => expect(pinNuevo()).toHaveValue(""));
    expect(password()).toHaveValue("");
  });

  it("muestra la contraseña incorrecta (422) en su propio campo", async () => {
    const user = montar();
    putMock.mockRejectedValue(
      apiError(422, "La contraseña actual no es correcta.", {
        password_actual: ["La contraseña actual no es correcta."],
      }),
    );
    await screen.findByText("Sin configurar");

    await user.type(pinNuevo(), "482913");
    await user.type(repetirPin(), "482913");
    await user.type(password(), "mala");
    await user.click(guardar());

    expect(
      await screen.findByText("La contraseña actual no es correcta."),
    ).toBeInTheDocument();
    // Es un error de campo, no un aviso general del formulario.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("muestra el PIN duplicado (422 sin `errors`) como aviso del formulario", async () => {
    const user = montar();
    putMock.mockRejectedValue(
      apiError(422, "Ese PIN ya está en uso en este establecimiento. Elige otro."),
    );
    await screen.findByText("Sin configurar");

    await user.type(pinNuevo(), "482913");
    await user.type(repetirPin(), "482913");
    await user.type(password(), "password");
    await user.click(guardar());

    expect(await screen.findByRole("alert")).toHaveTextContent(/ya está en uso/i);
  });

  it("elimina el PIN solo tras confirmar", async () => {
    const user = montar(CONFIGURADO);
    deleteMock.mockResolvedValue(SIN_CONFIGURAR);
    await screen.findByText("PIN configurado");

    await user.click(screen.getByRole("button", { name: /^eliminar$/i }));

    // El diálogo advierte la consecuencia antes de borrar nada.
    expect(
      await screen.findByRole("heading", { name: /eliminar pin de autorización/i }),
    ).toBeInTheDocument();
    expect(deleteMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /^eliminar pin$/i }));

    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith("/mi-pin"));
    expect(await screen.findByText("Sin configurar")).toBeInTheDocument();
  });
});
