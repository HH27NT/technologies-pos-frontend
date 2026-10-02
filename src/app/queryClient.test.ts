import { beforeEach, describe, expect, it } from "vitest";
import { qk } from "@/lib/api/queryKeys";
import { useAuthStore } from "@/lib/auth";
import { queryClient } from "./queryClient";

/**
 * El caché no puede sobrevivir a un cambio de sesión: las query keys no llevan el
 * establecimiento, así que reutilizarlas mostraría los datos de un bar en la sesión
 * de otro (regla de oro #4). Importar el módulo ya registra la suscripción.
 */

const rolPropio = [{ id: 10, name: "cajero_nocturno", etiqueta: "Cajero nocturno" }];

describe("caché ligado a la sesión", () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null });
    queryClient.clear();
  });

  it("descarta los datos del bar anterior cuando entra otro usuario", () => {
    useAuthStore.getState().setToken("token-bar-1");
    queryClient.setQueryData(qk.roles.all, rolPropio);

    useAuthStore.getState().setToken("token-bar-2");

    expect(queryClient.getQueryData(qk.roles.all)).toBeUndefined();
  });

  it("descarta los datos al cerrar sesión", () => {
    useAuthStore.getState().setToken("token-bar-1");
    queryClient.setQueryData(qk.roles.all, rolPropio);

    useAuthStore.getState().clearSession();

    expect(queryClient.getQueryData(qk.roles.all)).toBeUndefined();
  });

  it("conserva el caché mientras el token no cambia", () => {
    useAuthStore.getState().setToken("token-bar-1");
    queryClient.setQueryData(qk.roles.all, rolPropio);

    // Un cambio cualquiera del store (aquí la compuerta de caja) no es un cambio
    // de sesión: vaciar aquí tiraría el POS entero cada vez que se abre la caja.
    useAuthStore.getState().setCajaAbierta(true);

    expect(queryClient.getQueryData(qk.roles.all)).toEqual(rolPropio);
  });
});
