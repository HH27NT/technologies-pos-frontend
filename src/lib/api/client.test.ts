import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AxiosAdapter, AxiosRequestConfig } from "axios";
import { useAuthStore } from "@/lib/auth/authStore";
import { limpiarSesion } from "@/test/utils";
import { axiosInstance, client } from "./client";
import type { Paginated } from "./types";

/**
 * Cliente Axios: la pieza de infraestructura de la que cuelgan las 19 features.
 * Si el desenvuelto del envelope o la normalización de errores se rompen, no falla
 * una pantalla — fallan todas, y de formas difíciles de rastrear.
 *
 * Las pruebas sustituyen el adaptador de Axios (no hay red) y conservan los
 * interceptores reales, que es justo lo que se quiere ejercitar.
 */

/** Último request que vio el adaptador, para inspeccionar cabeceras y URL. */
let ultimoRequest: AxiosRequestConfig | undefined;

/** Adaptador que responde con el cuerpo y estado indicados. */
function responderCon(status: number, data: unknown): AxiosAdapter {
  return (config) => {
    ultimoRequest = config;
    const respuesta = {
      data,
      status,
      statusText: "",
      headers: {},
      config: config as never,
    };

    return status >= 200 && status < 300
      ? Promise.resolve(respuesta as never)
      : Promise.reject(
          Object.assign(new Error("Request failed"), {
            isAxiosError: true,
            response: respuesta,
            config,
          }),
        );
  };
}

/** Simula una caída de red: error de Axios sin `response`. */
function responderSinRed(): AxiosAdapter {
  return (config) => {
    ultimoRequest = config;
    return Promise.reject(
      Object.assign(new Error("Network Error"), { isAxiosError: true, config }),
    );
  };
}

const assignMock = vi.fn();
const locationOriginal = window.location;

beforeEach(() => {
  ultimoRequest = undefined;
  // window.location.assign no está implementado en jsdom; se sustituye para poder
  // afirmar la redirección al login sin que el entorno lance.
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...locationOriginal, pathname: "/app/ordenes", assign: assignMock },
  });
});

afterEach(() => {
  assignMock.mockReset();
  limpiarSesion();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: locationOriginal,
  });
});

describe("desenvuelto del envelope", () => {
  it("devuelve el recurso pelón, no el envelope { success, message, data }", async () => {
    axiosInstance.defaults.adapter = responderCon(200, {
      success: true,
      message: "Orden creada.",
      data: { id: 26, folio: "000012", total: "250.00" },
    });

    const orden = await client.get<{ id: number; folio: string }>("/ordenes/26");

    // Regla de oro #1: las features nunca deben leer `response.data.data`.
    expect(orden).toEqual({ id: 26, folio: "000012", total: "250.00" });
  });

  it("en colecciones expone { data, meta, links } para la DataTable", async () => {
    const meta = { current_page: 2, per_page: 15, total: 40, last_page: 3 };
    const links = { first: "/p=1", last: "/p=3", prev: "/p=1", next: "/p=3" };

    axiosInstance.defaults.adapter = responderCon(200, {
      success: true,
      message: "",
      data: [{ id: 1 }, { id: 2 }],
      meta,
      links,
    });

    const page = await client.get<Paginated<{ id: number }>>("/ordenes");

    expect(page.data).toHaveLength(2);
    expect(page.meta).toEqual(meta);
    expect(page.links).toEqual(links);
  });

  it("rellena links cuando el backend los omite (no rompe la paginación)", async () => {
    axiosInstance.defaults.adapter = responderCon(200, {
      success: true,
      message: "",
      data: [],
      meta: { current_page: 1, per_page: 15, total: 0, last_page: 1 },
    });

    const page = await client.get<Paginated<unknown>>("/ordenes");

    expect(page.links).toEqual({ first: null, last: null, prev: null, next: null });
  });

  it("deja pasar tal cual las respuestas sin envelope (204 y similares)", async () => {
    axiosInstance.defaults.adapter = responderCon(204, "");

    await expect(client.delete("/mi-pin")).resolves.toBe("");
  });
});

describe("token de sesión", () => {
  it("inyecta el Bearer del authStore en cada petición", async () => {
    useAuthStore.setState({ token: "token-de-prueba" });
    axiosInstance.defaults.adapter = responderCon(200, { success: true, message: "", data: {} });

    await client.get("/auth/me");

    expect(ultimoRequest?.headers?.Authorization).toBe("Bearer token-de-prueba");
  });

  it("no manda cabecera de autorización si no hay sesión (login)", async () => {
    useAuthStore.setState({ token: null });
    axiosInstance.defaults.adapter = responderCon(200, { success: true, message: "", data: {} });

    await client.post("/auth/login", { login: "admin", password: "x" });

    expect(ultimoRequest?.headers?.Authorization).toBeUndefined();
  });

  it("apunta a /api/v1 sobre la base configurada", async () => {
    axiosInstance.defaults.adapter = responderCon(200, { success: true, message: "", data: {} });

    await client.get("/ordenes");

    expect(ultimoRequest?.baseURL).toMatch(/\/api\/v1$/);
  });
});

describe("normalización de errores", () => {
  it("conserva el message en español del backend (regla #2)", async () => {
    axiosInstance.defaults.adapter = responderCon(409, {
      success: false,
      message: "No hay una caja abierta en el establecimiento.",
    });

    await expect(client.post("/ordenes", {})).rejects.toMatchObject({
      status: 409,
      message: "No hay una caja abierta en el establecimiento.",
    });
  });

  it("expone los errores de validación por campo (422)", async () => {
    axiosInstance.defaults.adapter = responderCon(422, {
      success: false,
      message: "El monto debe ser mayor a 0.",
      errors: { monto: ["El monto debe ser mayor a 0."] },
    });

    await expect(client.post("/ordenes/1/pagos", {})).rejects.toMatchObject({
      status: 422,
      errors: { monto: ["El monto debe ser mayor a 0."] },
    });
  });

  it("ante una caída de red da status 0 y un mensaje legible", async () => {
    axiosInstance.defaults.adapter = responderSinRed();

    // El POS opera en tablets con wifi irregular: este caso se ve a diario.
    await expect(client.get("/ordenes")).rejects.toMatchObject({
      status: 0,
      message: "No se pudo conectar con el servidor.",
    });
  });

  it("usa un mensaje genérico si el backend no manda ninguno", async () => {
    axiosInstance.defaults.adapter = responderCon(500, {});

    await expect(client.get("/ordenes")).rejects.toMatchObject({
      status: 500,
      message: "Ocurrió un error inesperado.",
    });
  });
});

describe("401", () => {
  it("limpia la sesión local y manda al login", async () => {
    useAuthStore.setState({
      token: "token-vencido",
      usuario: { id: 1, nombre: "Cajero" },
      permisos: ["ordenes.cobrar"],
    });
    axiosInstance.defaults.adapter = responderCon(401, {
      success: false,
      message: "No autenticado.",
    });

    await expect(client.get("/auth/me")).rejects.toMatchObject({ status: 401 });

    // Un token vencido no puede dejar permisos vivos en memoria: la UI seguiría
    // pintando acciones que el backend ya rechaza.
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().permisos).toEqual([]);
    expect(assignMock).toHaveBeenCalledWith("/");
  });

  it("no redirige si ya se está en el login (evita el bucle)", async () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...locationOriginal, pathname: "/", assign: assignMock },
    });
    axiosInstance.defaults.adapter = responderCon(401, {
      success: false,
      message: "Credenciales inválidas.",
    });

    await expect(client.post("/auth/login", {})).rejects.toMatchObject({ status: 401 });

    expect(assignMock).not.toHaveBeenCalled();
  });

  it("un 403 no cierra la sesión (falta permiso, no falta sesión)", async () => {
    useAuthStore.setState({ token: "token-vivo" });
    axiosInstance.defaults.adapter = responderCon(403, {
      success: false,
      message: "No tienes permiso para realizar esta acción.",
    });

    await expect(client.get("/reportes/margen")).rejects.toMatchObject({ status: 403 });

    expect(useAuthStore.getState().token).toBe("token-vivo");
    expect(assignMock).not.toHaveBeenCalled();
  });
});
