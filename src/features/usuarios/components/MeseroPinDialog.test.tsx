import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { apiError, limpiarSesion, renderConProviders } from "@/test/utils";
import { MeseroPinDialog } from "./MeseroPinDialog";
import type { EstadoMeseroPin, UsuarioRecurso } from "../types";

/**
 * PIN de mesero fijado por quien administra el personal. Lo que se protege aquí:
 *  - el PIN nunca se muestra: solo si está configurado y desde cuándo;
 *  - los PIN triviales y las confirmaciones que no coinciden se cortan en local;
 *  - el 422 de PIN en uso aterriza como aviso del formulario, no en el campo;
 *  - retirar el PIN exige confirmación.
 */

const { getMock, putMock, deleteMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  putMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  client: { get: getMock, put: putMock, delete: deleteMock },
}));

const MESERO: UsuarioRecurso = {
  id: 7,
  id_establecimiento: 9,
  nombre: "Mesero1",
  email: null,
  username: "mesero1",
  activo: true,
  id_rol: 4,
  es_super_admin: false,
  roles: ["mesero"],
};

const SIN_PIN: EstadoMeseroPin = { configurado: false, actualizado_at: null };
const CON_PIN: EstadoMeseroPin = {
  configurado: true,
  actualizado_at: "2026-08-15T18:20:00Z",
};

function montar(estado: EstadoMeseroPin = SIN_PIN) {
  getMock.mockResolvedValue(estado);
  renderConProviders(
    <MeseroPinDialog open onOpenChange={() => {}} usuario={MESERO} />,
    { permisos: ["usuarios.gestionar"] },
  );
  return userEvent.setup();
}

const pinNuevo = () => screen.getByLabelText("PIN nuevo");
const repetirPin = () => screen.getByLabelText("Repetir PIN");
const guardar = () => screen.getByRole("button", { name: /establecer pin|cambiar pin/i });

afterEach(() => {
  getMock.mockReset();
  putMock.mockReset();
  deleteMock.mockReset();
  limpiarSesion();
});

describe("MeseroPinDialog", () => {
  it("sin PIN invita a establecerlo y no ofrece retirarlo", async () => {
    montar(SIN_PIN);

    expect(await screen.findByText("Sin configurar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /establecer pin/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /retirar pin/i })).not.toBeInTheDocument();
    expect(getMock).toHaveBeenCalledWith("/usuarios/7/mesero-pin");
  });

  it("con PIN muestra desde cuándo y ofrece cambiarlo o retirarlo, nunca verlo", async () => {
    montar(CON_PIN);

    expect(await screen.findByText("PIN configurado")).toBeInTheDocument();
    expect(screen.getByText(/actualizado el/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cambiar pin/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retirar pin/i })).toBeInTheDocument();
    // Los campos son para un PIN NUEVO: el vigente no se puede recuperar.
    expect(pinNuevo()).toHaveValue("");
  });

  it("corta los PIN triviales en local, sin llamar al backend", async () => {
    const user = montar();
    await screen.findByText("Sin configurar");

    await user.type(pinNuevo(), "123456");
    await user.type(repetirPin(), "123456");
    await user.click(guardar());

    expect(await screen.findByText(/demasiado predecible/i)).toBeInTheDocument();
    expect(putMock).not.toHaveBeenCalled();
  });

  it("exige que la confirmación coincida", async () => {
    const user = montar();
    await screen.findByText("Sin configurar");

    await user.type(pinNuevo(), "482913");
    await user.type(repetirPin(), "482914");
    await user.click(guardar());

    expect(await screen.findByText(/no coincide/i)).toBeInTheDocument();
    expect(putMock).not.toHaveBeenCalled();
  });

  it("fija el PIN y limpia los campos", async () => {
    const user = montar();
    putMock.mockResolvedValue(CON_PIN);
    await screen.findByText("Sin configurar");

    await user.type(pinNuevo(), "482913");
    await user.type(repetirPin(), "482913");
    await user.click(guardar());

    await waitFor(() =>
      expect(putMock).toHaveBeenCalledWith("/usuarios/7/mesero-pin", { pin: "482913" }),
    );
    expect(await screen.findByText("PIN configurado")).toBeInTheDocument();
    await waitFor(() => expect(pinNuevo()).toHaveValue(""));
  });

  it("muestra el PIN duplicado (422 sin `errors`) como aviso del formulario", async () => {
    const user = montar();
    putMock.mockRejectedValue(
      apiError(422, "Ese PIN ya está en uso en este establecimiento. Elige otro."),
    );
    await screen.findByText("Sin configurar");

    await user.type(pinNuevo(), "482913");
    await user.type(repetirPin(), "482913");
    await user.click(guardar());

    expect(await screen.findByRole("alert")).toHaveTextContent(/ya está en uso/i);
  });

  it("retira el PIN solo tras confirmar", async () => {
    const user = montar(CON_PIN);
    deleteMock.mockResolvedValue(SIN_PIN);
    await screen.findByText("PIN configurado");

    await user.click(screen.getByRole("button", { name: /^retirar pin$/i }));

    expect(
      await screen.findByRole("heading", { name: /retirar pin de mesero/i }),
    ).toBeInTheDocument();
    expect(deleteMock).not.toHaveBeenCalled();

    await user.click(screen.getAllByRole("button", { name: /^retirar pin$/i }).at(-1)!);

    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith("/usuarios/7/mesero-pin"));
    expect(await screen.findByText("Sin configurar")).toBeInTheDocument();
  });
});
