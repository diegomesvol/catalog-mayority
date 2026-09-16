import { afterEach, describe, expect, it, vi } from "vitest";
import { obtenerCSVDesdeURL } from "./parseOrigen";

describe("obtenerCSVDesdeURL", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("rechaza una URL inválida", async () => {
    await expect(obtenerCSVDesdeURL("no-es-una-url")).rejects.toThrow(
      "El link ingresado no es una URL válida.",
    );
  });

  it("rechaza protocolos que no sean https", async () => {
    await expect(obtenerCSVDesdeURL("http://docs.google.com/algo")).rejects.toThrow(
      "El link debe ser https.",
    );
  });

  it("rechaza hosts fuera del allowlist (SSRF a un host arbitrario)", async () => {
    await expect(obtenerCSVDesdeURL("https://evil.example.com/csv")).rejects.toThrow(
      "El link debe ser un link de Google Sheets publicado (docs.google.com).",
    );
  });

  it("rechaza IPs/hosts internos típicos de SSRF aunque sean https", async () => {
    await expect(
      obtenerCSVDesdeURL("https://169.254.169.254/latest/meta-data/"),
    ).rejects.toThrow("El link debe ser un link de Google Sheets publicado (docs.google.com).");
    await expect(obtenerCSVDesdeURL("https://localhost/algo")).rejects.toThrow(
      "El link debe ser un link de Google Sheets publicado (docs.google.com).",
    );
  });

  it("rechaza subdominios/hosts que solo imitan docs.google.com", async () => {
    await expect(
      obtenerCSVDesdeURL("https://docs.google.com.evil.com/csv"),
    ).rejects.toThrow("El link debe ser un link de Google Sheets publicado (docs.google.com).");
  });

  it("acepta docs.google.com y parsea el CSV descargado", async () => {
    const csv = "ItemCode,Modelo\nA1,Zapato";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(csv),
      }),
    );

    const resultado = await obtenerCSVDesdeURL(
      "https://docs.google.com/spreadsheets/d/e/xyz/pub?output=csv",
    );
    expect(resultado.encabezados).toEqual(["ItemCode", "Modelo"]);
    expect(resultado.filas).toEqual([{ ItemCode: "A1", Modelo: "Zapato" }]);
  });

  it("propaga el status HTTP cuando la descarga falla", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404, text: () => Promise.resolve("") }),
    );
    await expect(
      obtenerCSVDesdeURL("https://docs.google.com/spreadsheets/d/e/xyz/pub?output=csv"),
    ).rejects.toThrow("No se pudo descargar el CSV del link (HTTP 404).");
  });
});
