// Tests de validarImagenSubida — cubre los 3 hallazgos de la auditoría
// 2026-09-17 que este módulo corrige: tamaño máximo, firma real de bytes
// (no solo el Content-Type declarado) y saneo de SVG (script/on*/href
// javascript:). No cubre las rutas de la API que lo usan (eso ya lo prueba
// pedidoServidor.test.ts como patrón de referencia para lógica de servidor
// en este proyecto) — solo la función pura.

import { describe, expect, it } from "vitest";
import { TAMANO_MAX_IMAGEN, validarImagenSubida } from "./validacionImagen";

// Tipado explícito <ArrayBuffer> (no el ArrayBufferLike por defecto): desde
// TS 5.7, Uint8Array es genérico y BlobPart exige el buffer concreto —
// new Uint8Array([...]) ya lo infiere bien, pero el parámetro con default
// de archivoPng necesitaba la anotación para que TS no lo ensanche a
// ArrayBufferLike (error de "npm run build" — el proyecto sí tipa esto).
const PNG_HEADER: Uint8Array<ArrayBuffer> = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG_HEADER: Uint8Array<ArrayBuffer> = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);

function archivoPng(bytes: Uint8Array<ArrayBuffer> = PNG_HEADER, nombre = "logo.png"): File {
  return new File([bytes], nombre, { type: "image/png" });
}

describe("validarImagenSubida", () => {
  it("rechaza un archivo vacío", async () => {
    const archivo = new File([], "vacio.png", { type: "image/png" });
    const r = await validarImagenSubida(archivo, ["image/png"], "El logo");
    expect(r.ok).toBe(false);
    expect(r.mensaje).toMatch(/falta/i);
  });

  it("rechaza un tipo no permitido", async () => {
    const archivo = new File([PNG_HEADER], "logo.gif", { type: "image/gif" });
    const r = await validarImagenSubida(archivo, ["image/png", "image/jpeg"], "El logo");
    expect(r.ok).toBe(false);
    expect(r.mensaje).toMatch(/PNG, JPG/);
  });

  it("rechaza un archivo que supera el tamaño máximo", async () => {
    const grande = new Uint8Array(TAMANO_MAX_IMAGEN + 1);
    grande.set(PNG_HEADER);
    const archivo = archivoPng(grande);
    const r = await validarImagenSubida(archivo, ["image/png"], "El logo");
    expect(r.ok).toBe(false);
    expect(r.mensaje).toMatch(/2MB/);
  });

  it("acepta un PNG válido (firma correcta) y devuelve sus bytes", async () => {
    const archivo = archivoPng();
    const r = await validarImagenSubida(archivo, ["image/png"], "El logo");
    expect(r.ok).toBe(true);
    expect(r.contentType).toBe("image/png");
    expect(r.bytes?.byteLength).toBe(PNG_HEADER.length);
  });

  it("rechaza un archivo con Content-Type falseado (bytes no coinciden con la firma declarada)", async () => {
    // Content-Type dice "image/png" pero el contenido real es un JPEG — el
    // caso concreto que la auditoría marcó como hueco: antes solo se
    // miraba archivo.type (lo manda el navegador, no dice nada del
    // contenido real).
    const archivo = new File([JPEG_HEADER], "logo.png", { type: "image/png" });
    const r = await validarImagenSubida(archivo, ["image/png"], "El logo");
    expect(r.ok).toBe(false);
    expect(r.mensaje).toMatch(/no coincide/i);
  });

  it("sanea <script> de un SVG antes de aceptarlo", async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="1" height="1"/></svg>`;
    const archivo = new File([svg], "logo.svg", { type: "image/svg+xml" });
    const r = await validarImagenSubida(archivo, ["image/svg+xml"], "El logo");
    expect(r.ok).toBe(true);
    const texto = new TextDecoder().decode(r.bytes!);
    expect(texto).not.toMatch(/<script/i);
    expect(texto).toMatch(/<rect/);
  });

  it("sanea atributos on* y href javascript: de un SVG", async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><a href="javascript:alert(2)"><rect onclick="alert(3)" width="1" height="1"/></a></svg>`;
    const archivo = new File([svg], "logo.svg", { type: "image/svg+xml" });
    const r = await validarImagenSubida(archivo, ["image/svg+xml"], "El logo");
    expect(r.ok).toBe(true);
    const texto = new TextDecoder().decode(r.bytes!);
    expect(texto).not.toMatch(/onload/i);
    expect(texto).not.toMatch(/onclick/i);
    expect(texto).not.toMatch(/javascript:/i);
  });

  it("rechaza un archivo .svg que no es SVG de verdad", async () => {
    const archivo = new File(["esto no es un svg"], "falso.svg", { type: "image/svg+xml" });
    const r = await validarImagenSubida(archivo, ["image/svg+xml"], "El logo");
    expect(r.ok).toBe(false);
  });
});
