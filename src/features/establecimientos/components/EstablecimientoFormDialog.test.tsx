import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { limpiarSesion, renderConProviders } from "@/test/utils";
import { EstablecimientoFormDialog } from "./EstablecimientoFormDialog";
import type { EstablecimientoRecurso } from "../types";

/**
 * Personal adicional (gerente/operador/mesero) en el alta de establecimiento
 * (PDF de mejoras): antes solo se podía crear el admin en este wizard y el resto
 * del equipo había que darlo de alta uno por uno después, en Usuarios.
 */

const { postMock, putMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  putMock: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  client: { get: vi.fn(), post: postMock, put: putMock, patch: vi.fn() },
}));

function montar(establecimiento?: EstablecimientoRecurso) {
  const onOpenChange = vi.fn();
  renderConProviders(
    <EstablecimientoFormDialog open onOpenChange={onOpenChange} establecimiento={establecimiento} />,
    { esSuperAdmin: true },
  );
  return { user: userEvent.setup(), onOpenChange };
}

async function llenarAdmin(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/nombre del administrador/i), "Ana López");
  await user.type(screen.getByLabelText(/^usuario$/i), "ana.bar");
  const [passAdmin, confirmAdmin] = screen.getAllByLabelText(/contraseña/i);
  await user.type(passAdmin, "password123");
  await user.type(confirmAdmin, "password123");
}

/**
 * Contenedor de la fila de personal, ubicado desde su botón "Quitar". Se usa
 * `.bg-surface-2` (no `.rounded-md`: el propio Button ya trae esa clase, así que
 * `closest` se detendría en el botón mismo en vez de subir hasta la fila).
 */
function filaDePersonal(): HTMLElement {
  return screen.getByRole("button", { name: /quitar/i }).closest(".bg-surface-2") as HTMLElement;
}

afterEach(() => {
  postMock.mockReset();
  putMock.mockReset();
  limpiarSesion();
});

describe("EstablecimientoFormDialog · personal adicional", () => {
  it("al crear, no hay filas de personal hasta que se agregan", () => {
    montar();

    expect(screen.getByText(/personal adicional/i)).toBeVisible();
    expect(screen.queryByLabelText(/^rol$/i)).not.toBeInTheDocument();
  });

  it("agrega una fila con Agregar y la quita con el botón de quitar", async () => {
    const { user } = montar();

    await user.click(screen.getByRole("button", { name: /agregar/i }));
    expect(screen.getByRole("combobox", { name: /^rol$/i })).toBeVisible();

    await user.click(screen.getByRole("button", { name: /quitar/i }));
    expect(screen.queryByRole("combobox", { name: /^rol$/i })).not.toBeInTheDocument();
  });

  it("manda el personal junto con el admin al crear", async () => {
    postMock.mockResolvedValue({ id: 1 });
    const { user } = montar();

    await user.type(screen.getByLabelText(/^nombre$/i), "Bar Nuevo");
    await llenarAdmin(user);

    await user.click(screen.getByRole("button", { name: /agregar/i }));
    const fila = filaDePersonal();

    await user.click(screen.getByRole("combobox", { name: /^rol$/i }));
    await user.click(await screen.findByRole("option", { name: /gerente/i }));
    await user.type(within(fila).getByLabelText(/^nombre$/i), "Gere Pérez");
    await user.type(within(fila).getByLabelText(/^usuario$/i), "gere.bar");
    const [passPersonal, confirmPersonal] = within(fila).getAllByLabelText(/contraseña|confirmar/i);
    await user.type(passPersonal, "password123");
    await user.type(confirmPersonal, "password123");

    await user.click(screen.getByRole("button", { name: /^guardar$/i }));

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith(
        "/establecimientos",
        expect.objectContaining({
          personal: [
            expect.objectContaining({ rol: "gerente", nombre: "Gere Pérez", username: "gere.bar" }),
          ],
        }),
      ),
    );
  });

  it("en edición no muestra la sección de personal ni la manda", () => {
    const establecimiento: EstablecimientoRecurso = {
      id: 4,
      nombre: "Bar Existente",
      razon_social: null,
      rfc: null,
      direccion: null,
      telefono: null,
      email: null,
      logo_url: null,
      zona_horaria: "America/Mexico_City",
      moneda: "MXN",
      activo: true,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
    montar(establecimiento);

    expect(screen.queryByText(/personal adicional/i)).not.toBeInTheDocument();
  });
});
