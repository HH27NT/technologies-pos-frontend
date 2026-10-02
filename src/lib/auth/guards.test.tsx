import { afterEach, describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { limpiarSesion, renderConProviders } from "@/test/utils";
import { PERMISOS_AUTORIZADOR } from "@/features/autorizaciones";
import { RequirePermission } from "./guards";

/**
 * Compuerta de permisos (regla de oro #3), con el caso que gatea `/app/mi-pin`.
 *
 * La trampa: el super admin pasa toda compuerta por su Gate::before, pero el PIN cuelga
 * de la membresía con un establecimiento y él no pertenece a ninguno — el backend le
 * responde 403 en `/mi-pin`. Por eso esa ruta lo excluye explícitamente: mostrarle la
 * pantalla solo lo llevaría a un error.
 */

const CONTENIDO = "PIN de autorización";

function montar(sesion: { permisos?: string[]; esSuperAdmin?: boolean }, excluirSuperAdmin = true) {
  renderConProviders(
    <RequirePermission perm={PERMISOS_AUTORIZADOR} excluirSuperAdmin={excluirSuperAdmin}>
      <p>{CONTENIDO}</p>
    </RequirePermission>,
    sesion,
  );
}

const vePantalla = () => screen.queryByText(CONTENIDO) !== null;
const veSinAcceso = () => screen.queryByRole("heading", { name: /sin acceso/i }) !== null;

afterEach(limpiarSesion);

describe("RequirePermission en /app/mi-pin", () => {
  it("deja entrar a quien puede autorizar algo (basta uno de los 4 permisos)", () => {
    montar({ permisos: ["inventario.ajustar"] });

    expect(vePantalla()).toBe(true);
  });

  it("cierra el paso al operador, que no puede autorizar nada", () => {
    montar({ permisos: ["ordenes.crear", "autorizaciones.solicitar"] });

    expect(vePantalla()).toBe(false);
    expect(veSinAcceso()).toBe(true);
  });

  it("cierra el paso al super admin aunque pase cualquier permiso: no tiene PIN", () => {
    montar({ permisos: [], esSuperAdmin: true });

    expect(vePantalla()).toBe(false);
    expect(veSinAcceso()).toBe(true);
  });

  it("sin `excluirSuperAdmin`, el super admin sigue pasando (compuerta normal)", () => {
    montar({ permisos: [], esSuperAdmin: true }, false);

    expect(vePantalla()).toBe(true);
  });
});
