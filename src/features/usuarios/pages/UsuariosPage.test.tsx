import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { limpiarSesion, renderConProviders } from "@/test/utils";
import { UsuariosPage } from "./UsuariosPage";
import type { UsuarioRecurso } from "../types";

/**
 * Acciones por fila de Usuarios. Lo que se protege aquí es que el PIN de mesero
 * **solo aparezca donde sirve**: un establecimiento sin terminal compartida no
 * gestiona PIN, y ofrecerlo sería un botón que no hace nada.
 */

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock("@/lib/api/client", () => ({
  client: { get: getMock, post: vi.fn(), put: vi.fn(), patch: vi.fn() },
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

const OTRO_MESERO: UsuarioRecurso = { ...MESERO, id: 8, nombre: "Mesero2", username: "mesero2" };

function montar({ terminalCompartida }: { terminalCompartida: boolean }) {
  getMock.mockImplementation((url: string) => {
    if (url.endsWith("/mesero-pin")) {
      return Promise.resolve({ configurado: false, actualizado_at: null });
    }
    if (url === "/usuarios") {
      return Promise.resolve({
        data: [MESERO, OTRO_MESERO],
        meta: { current_page: 1, per_page: 15, total: 2, last_page: 1 },
        links: { first: "", last: "", prev: null, next: null },
      });
    }
    if (url === "/roles") {
      return Promise.resolve([{ id: 4, name: "mesero", etiqueta: "Mesero", usuarios_count: 1 }]);
    }
    if (url === "/terminal/modo") {
      return Promise.resolve({
        terminal_compartida: terminalCompartida,
        bloqueo_segundos: 120,
      });
    }
    return Promise.resolve(null);
  });

  renderConProviders(<UsuariosPage />, {
    permisos: ["usuarios.gestionar", "usuarios.gestionar_admins"],
  });
  return userEvent.setup();
}

afterEach(() => {
  getMock.mockReset();
  limpiarSesion();
});

/** Abre el menú de acciones de una fila (0 = primera). */
async function abrirAcciones(user: ReturnType<typeof userEvent.setup>, fila = 0) {
  const botones = await screen.findAllByRole("button", { name: "Acciones" });
  await user.click(botones[fila]);
}

describe("UsuariosPage · PIN de mesero", () => {
  it("el PIN tecleado no salta de una persona a la siguiente", async () => {
    const user = montar({ terminalCompartida: true });

    await abrirAcciones(user, 0);
    await user.click(await screen.findByRole("menuitem", { name: /pin de mesero/i }));
    expect(await screen.findByText(/mesero1 lo teclea/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText("PIN nuevo"), "482913");

    // Cerrar y abrir el de otra persona: el diálogo se remonta (key por usuario).
    await user.keyboard("{Escape}");
    await abrirAcciones(user, 1);
    await user.click(await screen.findByRole("menuitem", { name: /pin de mesero/i }));

    expect(await screen.findByText(/mesero2 lo teclea/i)).toBeInTheDocument();
    expect(screen.getByLabelText("PIN nuevo")).toHaveValue("");
  });

  it("con terminal compartida ofrece la acción de PIN", async () => {
    const user = montar({ terminalCompartida: true });

    await abrirAcciones(user);

    expect(await screen.findByRole("menuitem", { name: /pin de mesero/i })).toBeInTheDocument();
  });

  it("sin terminal compartida no la ofrece, y el resto de acciones sigue igual", async () => {
    const user = montar({ terminalCompartida: false });

    await abrirAcciones(user);

    expect(await screen.findByRole("menuitem", { name: /editar/i })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("menuitem", { name: /pin de mesero/i })).not.toBeInTheDocument(),
    );
  });
});
