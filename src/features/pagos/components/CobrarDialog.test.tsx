import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { limpiarSesion, renderConProviders } from "@/test/utils";
import type { Orden } from "@/features/ordenes";
import type { RegistrarPagoResponse } from "../types";
import { CobrarDialog } from "./CobrarDialog";

/**
 * Cobro de una orden (M12). Es la ruta del dinero: lo que se protege aquí es que el
 * cliente NUNCA sea autoridad sobre los importes (regla de oro #6) y que el payload
 * no arrastre el tenant (regla #4).
 *
 * En particular, el saldo tras un pago parcial se toma de la respuesta del backend,
 * no de `saldo - monto`: si el backend recalcula (descuento, ítem cancelado en
 * paralelo), restar en el cliente le cobraría al cliente un importe equivocado.
 */

const { postMock, getMock, toastSuccess, toastError, toastWarning } = vi.hoisted(() => ({
  postMock: vi.fn(),
  getMock: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastWarning: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  client: { post: postMock, get: getMock },
}));

/** Estado del modo terminal compartida que ve el diálogo (GET /terminal/modo). */
function modoTerminal(activo: boolean) {
  getMock.mockResolvedValue({ terminal_compartida: activo, bloqueo_segundos: 300 });
}

vi.mock("sonner", () => ({
  toast: { success: toastSuccess, error: toastError, warning: toastWarning },
}));

const ORDEN: Orden = {
  id: 26,
  folio: "000012",
  estado: "abierta",
  id_mesa: 3,
  id_tipo_orden: 1,
  id_sesion_caja: 2,
  id_usuario: 5,
  descuento: "0.00",
  subtotal: "250.00",
  impuesto: "0.00",
  total: "250.00",
  notas: null,
  abierta_at: "2026-07-28T20:00:00Z",
  cerrada_at: null,
  mesa: null,
};

/** Respuesta de POST /ordenes/{id}/pagos con los valores que decide el backend. */
function respuesta(over: Partial<RegistrarPagoResponse> = {}): RegistrarPagoResponse {
  return {
    pago: {
      id: 1,
      id_orden: ORDEN.id,
      id_tipo_pago: 1,
      id_usuario: 5,
      monto: "250.00",
      referencia: null,
      pagado_at: "2026-07-28T20:05:00Z",
      tipo_pago: "efectivo",
    },
    cambio: 0,
    saldo: 0,
    estado_orden: "pagada",
    avisos_stock: [],
    ...over,
  };
}

function montar(saldo = 250) {
  const onPagada = vi.fn();
  const onOpenChange = vi.fn();

  renderConProviders(
    <CobrarDialog
      open
      onOpenChange={onOpenChange}
      orden={ORDEN}
      saldo={saldo}
      onPagada={onPagada}
    />,
    { permisos: ["ordenes.cobrar"] },
  );

  return { onPagada, onOpenChange, user: userEvent.setup() };
}

const montoInput = () => screen.getByPlaceholderText("0.00");
const botonCobrar = () => screen.getByRole("button", { name: /cobrar|registrar pago/i });

/**
 * Importe que acompaña a una etiqueta ("Total", "Saldo pendiente", "Cambio a entregar").
 * Los mismos pesos aparecen en varios sitios a la vez (total, saldo, botón), así que
 * buscar por el texto del importe es ambiguo: hay que anclarse a su etiqueta.
 */
function importeJuntoA(etiqueta: string): string {
  return screen.getByText(etiqueta).parentElement?.textContent ?? "";
}

/** Reemplaza el monto precargado (el diálogo lo inicializa con el saldo). */
async function escribirMonto(user: ReturnType<typeof userEvent.setup>, valor: string) {
  await user.clear(montoInput());
  await user.type(montoInput(), valor);
}

afterEach(() => {
  postMock.mockReset();
  getMock.mockReset();
  toastSuccess.mockReset();
  toastError.mockReset();
  toastWarning.mockReset();
  limpiarSesion();
});

describe("CobrarDialog · firma del mesero (terminal compartida)", () => {
  /** Pulsa los dígitos del teclado de PIN. */
  async function teclearPin(user: ReturnType<typeof userEvent.setup>, pin: string) {
    for (const d of pin) {
      await user.click(screen.getByRole("button", { name: d }));
    }
  }

  it("con el modo activo pide el PIN antes de cobrar y firma el pago con el token", async () => {
    modoTerminal(true);
    const { user } = montar(250);
    postMock.mockImplementation((url: string) => {
      if (url === "/terminal/identificar") {
        return Promise.resolve({ id: 7, nombre: "Mesero1", token: "tok-firma", bloqueo_segundos: 300 });
      }
      return Promise.resolve(respuesta({ estado_orden: "pagada", saldo: 0 }));
    });

    await user.click(botonCobrar());

    // Aún no se cobró nada: primero hay que firmar.
    expect(await screen.findByText(/teclea tu pin/i)).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalledWith(
      `/ordenes/${ORDEN.id}/pagos`,
      expect.anything(),
    );

    await teclearPin(user, "482913");

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith(`/ordenes/${ORDEN.id}/pagos`, {
        id_tipo_pago: 1,
        monto: 250,
        mesero_token: "tok-firma",
      }),
    );
  });

  it("si el PIN es inválido no se cobra nada y se ve el mensaje del backend", async () => {
    modoTerminal(true);
    const { user } = montar(250);
    postMock.mockRejectedValue({ status: 422, message: "PIN inválido." });

    await user.click(botonCobrar());
    await teclearPin(user, "111111");

    expect(await screen.findByRole("alert")).toHaveTextContent("PIN inválido.");
    expect(postMock).not.toHaveBeenCalledWith(
      `/ordenes/${ORDEN.id}/pagos`,
      expect.anything(),
    );
  });

  it("con el modo apagado cobra directo, sin pedir PIN ni mandar token", async () => {
    modoTerminal(false);
    const { user } = montar(250);
    postMock.mockResolvedValue(respuesta({ estado_orden: "pagada", saldo: 0 }));

    await user.click(botonCobrar());

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith(`/ordenes/${ORDEN.id}/pagos`, {
        id_tipo_pago: 1,
        monto: 250,
      }),
    );
    expect(screen.queryByText(/teclea tu pin/i)).not.toBeInTheDocument();
  });
});

describe("CobrarDialog", () => {
  it("muestra el total y el saldo que manda el backend, sin recalcularlos", () => {
    montar(250);

    expect(screen.getByText("Saldo pendiente")).toBeInTheDocument();
    // El total viene congelado del backend ("250.00"), solo se formatea.
    expect(screen.getAllByText(/\$250\.00/).length).toBeGreaterThan(0);
  });

  it("precarga el monto con el saldo pendiente para el caso común (pago exacto)", () => {
    montar(250);

    expect(montoInput()).toHaveValue("250");
  });

  it("envía solo id_tipo_pago y monto — nunca el establecimiento (tenant implícito)", async () => {
    postMock.mockResolvedValue(respuesta());
    const { user } = montar(250);

    await user.click(botonCobrar());

    await waitFor(() => expect(postMock).toHaveBeenCalled());
    const [url, payload] = postMock.mock.calls[0];

    expect(url).toBe("/ordenes/26/pagos");
    expect(payload).toEqual({ id_tipo_pago: 1, monto: 250 });
    // Regla de oro #4: el backend resuelve el establecimiento; mandarlo es un bug.
    expect(payload).not.toHaveProperty("id_establecimiento");
  });

  it("omite la referencia vacía en vez de mandar una cadena en blanco", async () => {
    postMock.mockResolvedValue(respuesta());
    const { user } = montar(250);

    // Tarjeta muestra el campo de referencia; se deja vacío a propósito.
    await user.click(screen.getByRole("button", { name: "Tarjeta" }));
    await user.click(botonCobrar());

    await waitFor(() => expect(postMock).toHaveBeenCalled());
    expect(postMock.mock.calls[0][1]).not.toHaveProperty("referencia");
  });

  it("manda la referencia recortada cuando el cajero la captura", async () => {
    postMock.mockResolvedValue(respuesta({ pago: { ...respuesta().pago, id_tipo_pago: 2 } }));
    const { user } = montar(250);

    await user.click(screen.getByRole("button", { name: "Tarjeta" }));
    await user.type(screen.getByPlaceholderText(/autorización, folio/i), "  AUTH-9931  ");
    await user.click(botonCobrar());

    await waitFor(() => expect(postMock).toHaveBeenCalled());
    expect(postMock.mock.calls[0][1]).toMatchObject({ referencia: "AUTH-9931" });
  });

  describe("sobrepago", () => {
    it("en efectivo anticipa el cambio y deja cobrar", async () => {
      const { user } = montar(250);

      await escribirMonto(user, "500");

      // 500 recibidos sobre un saldo de 250: el cajero debe ver los 250 de cambio.
      expect(importeJuntoA("Cambio a entregar")).toContain("$250.00");
      expect(botonCobrar()).toBeEnabled();
    });

    it("en tarjeta lo bloquea: el backend lo rechazaría", async () => {
      const { user } = montar(250);

      await user.click(screen.getByRole("button", { name: "Tarjeta" }));
      await escribirMonto(user, "500");

      expect(screen.getByText(/no puede exceder el saldo/i)).toBeInTheDocument();
      expect(botonCobrar()).toBeDisabled();
    });

    it("no envía nada si el monto excede en tarjeta", async () => {
      const { user } = montar(250);

      await user.click(screen.getByRole("button", { name: "Transferencia" }));
      await escribirMonto(user, "999");
      await user.click(botonCobrar());

      expect(postMock).not.toHaveBeenCalled();
    });
  });

  it("no permite cobrar 0 ni un monto vacío", async () => {
    const { user } = montar(250);

    await user.clear(montoInput());

    expect(botonCobrar()).toBeDisabled();

    await user.type(montoInput(), "0");
    expect(botonCobrar()).toBeDisabled();
    expect(postMock).not.toHaveBeenCalled();
  });

  describe("pago dividido", () => {
    it("toma el saldo restante del backend, NO de restar en el cliente", async () => {
      // El backend devuelve 140, no los 150 que daría `250 - 100`. Si la UI restara
      // por su cuenta le cobraría al cliente 10 pesos de más en el segundo pago.
      postMock.mockResolvedValue(
        respuesta({
          pago: { ...respuesta().pago, monto: "100.00" },
          saldo: 140,
          estado_orden: "abierta",
        }),
      );
      const { onPagada, onOpenChange, user } = montar(250);

      await escribirMonto(user, "100");
      await user.click(botonCobrar());

      // El saldo mostrado es el del backend...
      await waitFor(() => expect(importeJuntoA("Saldo pendiente")).toContain("$140.00"));
      // ...y en ninguna parte de la pantalla aparece el 150 que daría restar en cliente.
      expect(document.body.textContent).not.toContain("$150.00");
      // Y el monto se reencuadra al saldo real pendiente.
      expect(montoInput()).toHaveValue("140");
      // La orden sigue abierta: ni se cierra el diálogo ni se avisa de pagada.
      expect(onPagada).not.toHaveBeenCalled();
      expect(onOpenChange).not.toHaveBeenCalledWith(false);
      expect(toastSuccess).toHaveBeenCalledWith("Pago registrado");
    });

    it("lista los pagos ya asentados con el importe que confirmó el backend", async () => {
      postMock.mockResolvedValue(
        respuesta({
          pago: { ...respuesta().pago, monto: "100.00", tipo_pago: "efectivo" },
          saldo: 150,
          estado_orden: "abierta",
        }),
      );
      const { user } = montar(250);

      await escribirMonto(user, "100");
      await user.click(botonCobrar());

      expect(await screen.findByText("efectivo")).toBeInTheDocument();
      expect(screen.getByText(/\$100\.00/)).toBeInTheDocument();
    });
  });

  describe("orden liquidada", () => {
    it("avisa, cierra el diálogo y reporta el cambio que devuelve el backend", async () => {
      postMock.mockResolvedValue(respuesta({ cambio: 250, saldo: 0, estado_orden: "pagada" }));
      const { onPagada, onOpenChange, user } = montar(250);

      await escribirMonto(user, "500");
      await user.click(botonCobrar());

      await waitFor(() => expect(onPagada).toHaveBeenCalledTimes(1));
      expect(onOpenChange).toHaveBeenCalledWith(false);
      // El cambio anunciado es el del backend, no el estimado en pantalla.
      expect(toastSuccess).toHaveBeenCalledWith(expect.stringContaining("$250.00"));
    });

    it("sin cambio, el aviso no inventa uno", async () => {
      postMock.mockResolvedValue(respuesta({ cambio: 0, saldo: 0, estado_orden: "pagada" }));
      const { user } = montar(250);

      await user.click(botonCobrar());

      await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Orden pagada"));
    });

    it("si algún insumo quedó en negativo (P2), avisa además de cerrar el pago", async () => {
      postMock.mockResolvedValue(
        respuesta({
          estado_orden: "pagada",
          avisos_stock: [{ id_insumo: 9, insumo: "Limón", stock_resultante: -3 }],
        }),
      );
      const { onPagada, user } = montar(250);

      await user.click(botonCobrar());

      await waitFor(() => expect(onPagada).toHaveBeenCalledTimes(1));
      expect(toastWarning).toHaveBeenCalledWith(
        expect.stringContaining("Limón"),
        expect.anything(),
      );
    });

    it("sin avisos de stock, no llama al toast de advertencia", async () => {
      postMock.mockResolvedValue(respuesta({ estado_orden: "pagada", avisos_stock: [] }));
      const { user } = montar(250);

      await user.click(botonCobrar());

      await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
      expect(toastWarning).not.toHaveBeenCalled();
    });
  });

  it("muestra el mensaje del backend cuando el cobro falla (regla #2)", async () => {
    postMock.mockRejectedValue({
      status: 409,
      message: "No hay una caja abierta en el establecimiento.",
    });
    const { onPagada, user } = montar(250);

    await user.click(botonCobrar());

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("No hay una caja abierta en el establecimiento."),
    );
    expect(onPagada).not.toHaveBeenCalled();
  });
});
