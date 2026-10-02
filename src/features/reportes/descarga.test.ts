import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { descargarExportacion } from "./api";

/**
 * Descarga de una exportación (M16).
 *
 * `POST /reportes/exportar` responde 202 y encola el archivo, así que la URL de descarga
 * da 404 hasta que el worker lo escribe. Con un solo reintento a los 900 ms el PDF fallaba
 * casi siempre —el archivo quedaba bien en el servidor y el navegador se rendía antes—, y
 * ningún test lo veía porque nadie probaba la exportación.
 *
 * Lo que se blinda aquí: que se espere lo suficiente, que **el sondeo no descargue el
 * archivo una vez por intento**, y que un error que no es "todavía no" falle de inmediato.
 */

function respuesta404() {
  return { ok: false, status: 404 } as Response;
}

function respuestaOk() {
  return {
    ok: true,
    status: 200,
    blob: async () => new Blob(["contenido"]),
  } as unknown as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;
let crearObjectUrl: ReturnType<typeof vi.fn>;
let clicks: number;

beforeEach(() => {
  vi.useFakeTimers();

  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  // jsdom no implementa createObjectURL; además cuenta cuántas veces se materializa
  // un archivo, que es justo lo que no debe crecer con los reintentos.
  crearObjectUrl = vi.fn(() => "blob:falso");
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: crearObjectUrl,
    revokeObjectURL: vi.fn(),
  });

  clicks = 0;
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {
    clicks++;
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("descargarExportacion", () => {
  it("espera a que el worker escriba el archivo y lo guarda una sola vez", async () => {
    // Cuatro 404 (el worker aún no despierta) y al quinto intento el archivo aparece.
    fetchMock
      .mockResolvedValueOnce(respuesta404())
      .mockResolvedValueOnce(respuesta404())
      .mockResolvedValueOnce(respuesta404())
      .mockResolvedValueOnce(respuesta404())
      .mockResolvedValue(respuestaOk());

    const promesa = descargarExportacion("http://api/exportaciones/x.pdf", "reporte.pdf");
    await vi.advanceTimersByTimeAsync(11_000);
    await expect(promesa).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(5);
    // El sondeo consulta; solo el 200 materializa el archivo. Cinco intentos, una descarga.
    expect(crearObjectUrl).toHaveBeenCalledTimes(1);
    expect(clicks).toBe(1);
  });

  it("no reintenta ante un error que no se arregla esperando", async () => {
    // Un 403 no va a volverse 200 en diez segundos: mejor decirlo de una vez.
    fetchMock.mockResolvedValue({ ok: false, status: 403 } as Response);

    // El aserto se engancha ANTES de correr el reloj: si no, el rechazo ocurre sin
    // manejador y Vitest lo reporta como unhandled rejection aunque el test pase.
    const promesa = descargarExportacion("http://api/exportaciones/x.pdf", "reporte.pdf");
    const fallo = expect(promesa).rejects.toThrow("No se pudo descargar el archivo");
    await vi.advanceTimersByTimeAsync(11_000);
    await fallo;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(clicks).toBe(0);
  });

  it("se rinde si el archivo nunca aparece, sin haber descargado nada", async () => {
    fetchMock.mockResolvedValue(respuesta404());

    const promesa = descargarExportacion("http://api/exportaciones/x.pdf", "reporte.pdf");
    const fallo = expect(promesa).rejects.toThrow("No se pudo descargar el archivo");
    await vi.advanceTimersByTimeAsync(11_000);
    await fallo;

    expect(fetchMock).toHaveBeenCalledTimes(10);
    expect(crearObjectUrl).not.toHaveBeenCalled();
    expect(clicks).toBe(0);
  });
});
