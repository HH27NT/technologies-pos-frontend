import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { limpiarSesion, renderConProviders } from "@/test/utils";
import { RolesPage } from "./pages/RolesPage";
import type { GrupoPermisos, RolRecurso } from "./types";

/**
 * Editor de roles (M04 · fase B). Se protege la regla que da forma a la pantalla —los
 * presets se CLONAN, no se editan— y el contrato del alta con el backend.
 */

const { getMock, postMock, putMock, deleteMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  putMock: vi.fn(),
  deleteMock: vi.fn(),
}));
vi.mock("@/lib/api/client", () => ({
  client: { get: getMock, post: postMock, put: putMock, delete: deleteMock, patch: vi.fn() },
}));

const PRESET: RolRecurso = {
  id: 1,
  name: "operador",
  etiqueta: null,
  descripcion: null,
  id_establecimiento: 1,
  es_sistema: true,
  permisos: ["ordenes.crear", "ordenes.cobrar"],
  usuarios_count: 3,
};

const PROPIO: RolRecurso = {
  id: 7,
  name: "cajero_nocturno",
  etiqueta: "Cajero nocturno",
  descripcion: "Cobra en el turno de noche.",
  id_establecimiento: 1,
  es_sistema: false,
  permisos: ["ordenes.crear"],
  usuarios_count: 0,
};

const CATALOGO: GrupoPermisos[] = [
  {
    grupo: "venta",
    etiqueta: "Punto de venta",
    permisos: [
      { nombre: "ordenes.crear", etiqueta: "Abrir órdenes", descripcion: "Iniciar una cuenta." },
      { nombre: "ordenes.cobrar", etiqueta: "Cobrar", descripcion: "Registrar el pago." },
    ],
  },
];

/** El componente pide /roles y, al abrir el diálogo, /roles/permisos. */
function mockGet(roles: RolRecurso[] = [PRESET, PROPIO]) {
  getMock.mockImplementation((url: string) =>
    url === "/roles/permisos" ? Promise.resolve(CATALOGO) : Promise.resolve(roles),
  );
}

afterEach(() => {
  getMock.mockReset();
  postMock.mockReset();
  putMock.mockReset();
  deleteMock.mockReset();
  limpiarSesion();
});

describe("RolesPage", () => {
  it("separa los roles del sistema de los propios y usa su etiqueta legible", async () => {
    mockGet();
    renderConProviders(<RolesPage />, { permisos: ["roles.gestionar"] });

    // El preset se muestra traducido (su `etiqueta` viene nula del backend).
    expect(await screen.findByText("Operador")).toBeInTheDocument();
    // El rol a medida muestra su etiqueta, nunca el slug técnico.
    expect(screen.getByText("Cajero nocturno")).toBeInTheDocument();
    expect(screen.queryByText("cajero_nocturno")).not.toBeInTheDocument();
  });

  it("ofrece clonar (no editar) los roles del sistema", async () => {
    mockGet();
    renderConProviders(<RolesPage />, { permisos: ["roles.gestionar"] });

    await screen.findByText("Operador");

    // El preset trae su acción directa "Clonar"; no hay forma de editarlo desde aquí.
    expect(screen.getByRole("button", { name: /clonar/i })).toBeInTheDocument();
  });

  it("al clonar, hereda los permisos del origen y manda clonar_de", async () => {
    mockGet();
    postMock.mockResolvedValue({ ...PROPIO, id: 9 });
    const user = userEvent.setup();
    renderConProviders(<RolesPage />, { permisos: ["roles.gestionar"] });

    await screen.findByText("Operador");
    await user.click(screen.getByRole("button", { name: /clonar/i }));

    // Propone un nombre editable y precarga los 2 permisos del preset.
    const nombre = await screen.findByLabelText(/nombre del rol/i);
    expect(nombre).toHaveValue("Operador (copia)");
    expect(await screen.findByText("2 seleccionados")).toBeInTheDocument();

    await user.clear(nombre);
    await user.type(nombre, "Cajero de barra");
    await user.click(screen.getByRole("button", { name: /crear rol/i }));

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith("/roles", {
        etiqueta: "Cajero de barra",
        permisos: ["ordenes.crear", "ordenes.cobrar"],
        clonar_de: 1,
      }),
    );
  });

  it("sin `roles.gestionar` no ofrece ninguna acción de escritura", async () => {
    mockGet();
    renderConProviders(<RolesPage />, { permisos: ["usuarios.gestionar"] });

    await screen.findByText("Operador");

    expect(screen.queryByRole("button", { name: /clonar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /crear rol/i })).not.toBeInTheDocument();
  });

  it("pluraliza permisos y usuarios en el conteo de cada tarjeta", async () => {
    mockGet();
    renderConProviders(<RolesPage />, { permisos: ["roles.gestionar"] });

    await screen.findByText("Operador");

    expect(screen.getByText(/2 permisos · 3 usuarios/)).toBeInTheDocument();
    expect(screen.getByText(/1 permiso · 0 usuarios/)).toBeInTheDocument();
  });

  it("invita a clonar cuando aún no hay roles propios", async () => {
    mockGet([PRESET]);
    renderConProviders(<RolesPage />, { permisos: ["roles.gestionar"] });

    expect(await screen.findByText(/aún no tienes roles propios/i)).toBeInTheDocument();
  });
});
