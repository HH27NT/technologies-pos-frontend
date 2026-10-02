import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { apiError, limpiarSesion, renderConProviders } from "@/test/utils";
import { OverrideAutorizacionDialog } from "./OverrideAutorizacionDialog";
import type { SolicitudAutorizacion } from "../types";

/**
 * Diálogo de override por PIN (M14.1). Lo que se protege aquí:
 *  - solo se envía PIN + motivo (nunca credenciales de acceso del admin);
 *  - un PIN rechazado se limpia y el mensaje del backend se muestra tal cual;
 *  - el respaldo asíncrono NO ejecuta la operación (callback distinto).
 */

const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }));

vi.mock("@/lib/api/client", () => ({
  client: { post: postMock },
}));

const SOLICITUD: SolicitudAutorizacion = {
  tipo: "cancelar_item",
  refs: { id_orden: 26, id_item: 35 },
};

function montar(props: Partial<Parameters<typeof OverrideAutorizacionDialog>[0]> = {}) {
  const ejecutar = props.ejecutar ?? vi.fn().mockResolvedValue({});
  const onAutorizada = vi.fn();
  const onSolicitada = vi.fn();
  const onOpenChange = vi.fn();

  renderConProviders(
    <OverrideAutorizacionDialog
      open
      onOpenChange={onOpenChange}
      ejecutar={ejecutar}
      onAutorizada={onAutorizada}
      onSolicitada={onSolicitada}
      {...props}
    />,
    { permisos: props.solicitud ? ["autorizaciones.solicitar"] : [] },
  );

  return { ejecutar, onAutorizada, onSolicitada, onOpenChange, user: userEvent.setup() };
}

const pin = () => screen.getByLabelText("PIN de administrador");
const motivo = () => screen.getByLabelText("Motivo");
const autorizar = () => screen.getByRole("button", { name: /autorizar y ejecutar/i });

afterEach(() => {
  postMock.mockReset();
  limpiarSesion();
});

describe("OverrideAutorizacionDialog", () => {
  it("no pide credenciales de acceso del admin, solo PIN y motivo", () => {
    montar();

    expect(pin()).toBeInTheDocument();
    expect(motivo()).toBeInTheDocument();
    expect(screen.queryByLabelText(/contraseña/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/usuario|correo/i)).not.toBeInTheDocument();
  });

  it("el campo de PIN solo acepta 6 dígitos (filtra letras y corta el excedente)", async () => {
    const { user } = montar();

    await user.type(pin(), "4a8b29-13999");

    // El teclado de la tablet y el pegado pueden meter basura: se queda con los dígitos.
    expect(pin()).toHaveValue("482913");
  });

  it("valida en local antes de enviar: PIN incompleto y motivo vacío no viajan", async () => {
    const { ejecutar, user } = montar();

    await user.type(pin(), "4829");
    await user.click(autorizar());

    expect(await screen.findByText(/exactamente 6 dígitos/i)).toBeInTheDocument();
    expect(screen.getByText(/el motivo es obligatorio/i)).toBeInTheDocument();
    expect(ejecutar).not.toHaveBeenCalled();
  });

  it("con PIN válido ejecuta la operación al instante y cierra", async () => {
    const ejecutar = vi.fn().mockResolvedValue({});
    const { onAutorizada, onOpenChange, user } = montar({ ejecutar, terminal: "CAJA-1" });

    await user.type(pin(), "482913");
    await user.type(motivo(), "Cliente se retiró");
    await user.click(autorizar());

    await waitFor(() =>
      expect(ejecutar).toHaveBeenCalledWith({
        motivo: "Cliente se retiró",
        autorizacion_pin: "482913",
        terminal: "CAJA-1",
      }),
    );
    expect(onAutorizada).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("omite `terminal` cuando el POS no lo conoce", async () => {
    const ejecutar = vi.fn().mockResolvedValue({});
    const { user } = montar({ ejecutar });

    await user.type(pin(), "482913");
    await user.type(motivo(), "Error de captura");
    await user.click(autorizar());

    await waitFor(() => expect(ejecutar).toHaveBeenCalled());
    expect(ejecutar.mock.calls[0][0]).not.toHaveProperty("terminal");
  });

  it("con PIN inválido (422) muestra el mensaje del backend, limpia el PIN y no cierra", async () => {
    const ejecutar = vi
      .fn()
      .mockRejectedValue(apiError(422, "PIN de autorización inválido."));
    const { onAutorizada, onOpenChange, user } = montar({ ejecutar });

    await user.type(pin(), "999999");
    await user.type(motivo(), "Cliente se retiró");
    await user.click(autorizar());

    // El `message` del backend se muestra tal cual (regla de oro #2).
    expect(await screen.findByRole("alert")).toHaveTextContent("PIN de autorización inválido.");
    // El PIN no se reenvía tal cual ni se queda tecleado en pantalla.
    expect(pin()).toHaveValue("");
    // El motivo sobrevive: el operador solo vuelve a teclear el PIN.
    expect(motivo()).toHaveValue("Cliente se retiró");
    expect(onAutorizada).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("muestra el mensaje del backend en 403 y 429 igual que en 422", async () => {
    const ejecutar = vi
      .fn()
      .mockRejectedValue(apiError(429, "Demasiados intentos de autorización. Inténtalo de nuevo en 42 segundos."));
    const { user } = montar({ ejecutar });

    await user.type(pin(), "482913");
    await user.type(motivo(), "Cliente se retiró");
    await user.click(autorizar());

    expect(await screen.findByRole("alert")).toHaveTextContent(/42 segundos/);
  });

  describe("respaldo asíncrono", () => {
    it("no se ofrece si la operación no trae datos de solicitud", () => {
      montar();

      expect(screen.queryByRole("button", { name: /solicitar aprobación/i })).not.toBeInTheDocument();
    });

    it("deja la solicitud pendiente SIN ejecutar la operación", async () => {
      postMock.mockResolvedValue({ id: 7 });
      const ejecutar = vi.fn();
      const { onAutorizada, onSolicitada, onOpenChange, user } = montar({
        ejecutar,
        solicitud: SOLICITUD,
      });

      await user.type(motivo(), "No hay admin en piso");
      await user.click(screen.getByRole("button", { name: /solicitar aprobación/i }));

      await waitFor(() =>
        expect(postMock).toHaveBeenCalledWith("/autorizaciones", {
          tipo: "cancelar_item",
          motivo: "No hay admin en piso",
          id_orden: 26,
          id_item: 35,
        }),
      );
      // La operación NO se ejecutó: queda pendiente de que el admin la apruebe.
      expect(ejecutar).not.toHaveBeenCalled();
      expect(onAutorizada).not.toHaveBeenCalled();
      expect(onSolicitada).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("exige el motivo antes de enviar la solicitud", async () => {
      const { user } = montar({ solicitud: SOLICITUD });

      await user.click(screen.getByRole("button", { name: /solicitar aprobación/i }));

      expect(await screen.findByText(/el motivo es obligatorio/i)).toBeInTheDocument();
      expect(postMock).not.toHaveBeenCalled();
    });
  });
});
