import { afterEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { limpiarSesion, renderConProviders } from "@/test/utils";
import { PosLayout } from "@/app/layout/PosLayout";
import { RutaError } from "./RutaError";

/**
 * Manejo de errores de render (`errorElement`). Lo que se protege es la promesa del
 * bloque: **un error de pantalla no saca al operador del POS**. Por eso el boundary
 * cuelga de una ruta intermedia sin `path` — si colgara de la ruta del layout, el
 * error reemplazaría el shell entero y el operador perdería caja y sesión.
 */

vi.mock("@/features/caja", () => ({ useSincronizarCajaAbierta: () => undefined }));
vi.mock("@/features/auth", () => ({ useLogout: () => ({ mutate: vi.fn(), isPending: false }) }));

/** Pantalla que truena al renderizar, como lo haría un bug en el POS. */
function PantallaQueTruena(): never {
  throw new Error("boom de render");
}

/** Monta el POS real con el boundary colgado como en `router.tsx`. */
function montarPos(ruta = "/pos", elemento = <PantallaQueTruena />) {
  const router = createMemoryRouter(
    [
      {
        element: <PosLayout />,
        children: [
          {
            errorElement: <RutaError alcance="pos" />,
            children: [
              { path: "/pos", element: elemento },
              { path: "/pos/ordenes/:id", element: elemento },
            ],
          },
        ],
      },
    ],
    { initialEntries: [ruta] },
  );
  return renderConProviders(<RouterProvider router={router} />, {
    permisos: ["ordenes.crear"],
  });
}

afterEach(() => {
  limpiarSesion();
  vi.restoreAllMocks();
});

describe("RutaError en el POS", () => {
  it("conserva el chrome del POS cuando una pantalla truena", () => {
    // React y jsdom escupen el error en consola aunque el boundary lo atrape.
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    montarPos();

    // El error se pinta…
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Algo falló en esta pantalla")).toBeInTheDocument();

    // …pero el operador NO perdió el shell: sigue el encabezado con el estado de
    // caja y su salida de sesión. Esto es lo que evita sacarlo del POS.
    // La marca parte el sufijo "· Punto de venta" en un span aparte para ocultarlo en
    // móvil, así que se busca por el texto propio del nodo, no por la cadena completa.
    expect(screen.getByText("Bar POS")).toBeInTheDocument();
    expect(screen.getByText("Caja cerrada")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cerrar sesión/i })).toBeInTheDocument();
  });

  it("ofrece volver al POS, nunca a administración", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = userEvent.setup();

    montarPos("/pos/ordenes/9");

    const volver = screen.getByRole("button", { name: /volver al punto de venta/i });
    expect(volver).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /volver al inicio/i })).not.toBeInTheDocument();

    // Navegar remonta la ruta y descarta el boundary: recuperación sin recargar.
    await user.click(volver);
    expect(screen.getByRole("alert")).toBeInTheDocument(); // /pos también truena en este test
  });

  it("trata el chunk que no carga como versión nueva, con recargar como única salida", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    function ChunkCaido(): never {
      throw new Error("Failed to fetch dynamically imported module: /assets/PosPage.js");
    }
    montarPos("/pos", <ChunkCaido />);

    expect(screen.getByText("Hay una versión nueva del sistema")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /recargar/i })).toBeInTheDocument();
    // No tiene sentido "volver": el chunk seguiría sin existir.
    expect(
      screen.queryByRole("button", { name: /volver al punto de venta/i }),
    ).not.toBeInTheDocument();
  });
});
