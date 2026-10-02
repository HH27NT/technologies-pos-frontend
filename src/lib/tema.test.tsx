import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SelectorTema } from "@/app/layout/SelectorTema";
import { useAuthStore } from "@/lib/auth";
import { limpiarSesion } from "@/test/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContextoModoTema, useModoAdministracion, useTemaStore } from "./tema";

/**
 * Tema de las primitivas portaladas.
 *
 * Radix monta diálogos, selects y menús pegados a `document.body`, fuera del contenedor con
 * `data-mode="dark"` del POS, así que resolvían los tokens claros: Nueva orden, Cobrar y el
 * teclado de firma salían en blanco sobre la pantalla oscura. Lo que se blinda aquí es que el
 * modo llegue al portal, y —tan importante— que **la administración no se vuelva oscura** por
 * el mismo mecanismo.
 */

function DialogoAbierto() {
  return (
    <Dialog open>
      <DialogContent>
        <DialogTitle>Cobrar</DialogTitle>
      </DialogContent>
    </Dialog>
  );
}

describe("modo de tema en primitivas portaladas", () => {
  it("estampa el modo oscuro en el diálogo cuando el árbol es del POS", () => {
    render(
      <ContextoModoTema.Provider value="dark">
        <DialogoAbierto />
      </ContextoModoTema.Provider>,
    );

    // El diálogo vive en un portal: se busca desde su contenido, no desde el árbol renderizado.
    const contenido = screen.getByText("Cobrar").closest("[role=dialog]");
    expect(contenido).toHaveAttribute("data-mode", "dark");
  });

  it("no estampa nada en administración, que es el tema claro de la raíz", () => {
    render(<DialogoAbierto />);

    const contenido = screen.getByText("Cobrar").closest("[role=dialog]");
    expect(contenido).not.toHaveAttribute("data-mode");
  });

  it("también llega a la lista de un select, que es otro portal", () => {
    render(
      <ContextoModoTema.Provider value="dark">
        <Select open>
          <SelectTrigger>
            <SelectValue placeholder="Mesa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Mesa 1</SelectItem>
          </SelectContent>
        </Select>
      </ContextoModoTema.Provider>,
    );

    expect(screen.getByText("Mesa 1").closest("[data-mode]")).toHaveAttribute(
      "data-mode",
      "dark",
    );
  });
});

/* ─────────────────────────── Preferencia de la administración ─────────────────────────── */

/** Sonda: expone el modo resuelto sin pintar una pantalla completa. */
function SondaModo() {
  const modo = useModoAdministracion();
  return <span data-testid="modo">{modo ?? "claro"}</span>;
}

/** Sustituye `matchMedia` para simular el tema del sistema operativo. */
function sistemaEnOscuro(oscuro: boolean) {
  window.matchMedia = ((consulta: string) =>
    ({
      matches: oscuro,
      media: consulta,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
}

/** Sesión simulada: el tema se guarda por persona, así que hay que decir quién está dentro. */
function sesionDe(idUsuario: number) {
  useAuthStore.setState({
    token: "test-token",
    usuario: { id: idUsuario, nombre: `Usuario ${idUsuario}` },
    permisos: [],
    esSuperAdmin: false,
    sesionCargada: true,
  });
}

describe("preferencia de tema de la administración", () => {
  const matchMediaOriginal = window.matchMedia;

  beforeEach(() => sesionDe(1));

  afterEach(() => {
    window.matchMedia = matchMediaOriginal;
    useTemaStore.setState({ porUsuario: {} });
    limpiarSesion();
  });

  it("por defecto es claro, aunque el sistema esté en oscuro", () => {
    // Mientras el tema oscuro de administración no pase su revisión visual, nadie se lo
    // encuentra sin pedirlo.
    sistemaEnOscuro(true);
    render(<SondaModo />);

    expect(screen.getByTestId("modo")).toHaveTextContent("claro");
  });

  it("la preferencia explícita gana sobre el sistema, en los dos sentidos", () => {
    sistemaEnOscuro(true);
    useTemaStore.setState({ porUsuario: { 1: "claro" } });
    const { unmount } = render(<SondaModo />);
    expect(screen.getByTestId("modo")).toHaveTextContent("claro");
    unmount();

    sistemaEnOscuro(false);
    useTemaStore.setState({ porUsuario: { 1: "oscuro" } });
    render(<SondaModo />);
    expect(screen.getByTestId("modo")).toHaveTextContent("dark");
  });

  it("con `sistema` sigue al sistema operativo", () => {
    sistemaEnOscuro(true);
    useTemaStore.setState({ porUsuario: { 1: "sistema" } });
    render(<SondaModo />);

    expect(screen.getByTestId("modo")).toHaveTextContent("dark");
  });

  it("el tema de una persona NO se le impone a la siguiente en el mismo equipo", () => {
    // El caso que hace falta en un SaaS: la terminal del bar y la computadora de la oficina son
    // compartidas. Si la preferencia fuera del navegador, el gusto del primero sería el de todos.
    useTemaStore.setState({ porUsuario: { 1: "oscuro" } });
    sistemaEnOscuro(false);

    const { unmount } = render(<SondaModo />);
    expect(screen.getByTestId("modo")).toHaveTextContent("dark");
    unmount();

    sesionDe(2); // entra otra persona en el mismo navegador
    render(<SondaModo />);
    expect(screen.getByTestId("modo")).toHaveTextContent("claro");

    // Y la del primero sigue guardada para cuando vuelva.
    expect(useTemaStore.getState().porUsuario).toMatchObject({ 1: "oscuro" });
  });

  it("el selector guarda la preferencia a nombre de quien tiene la sesión", async () => {
    const usuario = userEvent.setup();
    sesionDe(7);
    render(<SelectorTema />);

    await usuario.click(screen.getByRole("button", { name: /tema/i }));
    await usuario.click(screen.getByRole("menuitemradio", { name: "Oscuro" }));

    expect(useTemaStore.getState().porUsuario).toEqual({ 7: "oscuro" });
  });
});
