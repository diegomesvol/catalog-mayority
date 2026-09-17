// Validación centralizada de imágenes subidas desde el panel admin —
// antes cada ruta (logo, fondo de login, colecciones, logos del footer,
// guía de tallas) repetía su propia lista de tipos permitidos y, en 3 de
// las 5, no chequeaba tamaño (solo config/logo y logos-footer/imagen lo
// hacían, con el mismo límite copiado dos veces). Este módulo unifica las
// tres cosas en un solo lugar:
//   1. tipo declarado (Content-Type) contra un allowlist,
//   2. tamaño máximo,
//   3. firma real de los primeros bytes del archivo (magic bytes) — el
//      Content-Type lo manda el navegador y no garantiza qué hay adentro:
//      sin esto, un .html renombrado a "logo.png" con Content-Type
//      falsificado pasaba el chequeo anterior sin problema.
// SVG es el único tipo sin firma binaria (es texto) — ahí se sanea el
// contenido en vez de chequear bytes (ver sanearSvg): sin esto, un SVG con
// <script> o un atributo onload/onclick corre en el dominio del sitio
// apenas alguien lo ve (queda servido desde el bucket público) — XSS
// almacenado si una cuenta admin comprometida sube uno con ese payload.

export const TAMANO_MAX_IMAGEN = 2 * 1024 * 1024; // 2MB — mismo límite en las 5 rutas de imagen del panel

const ETIQUETA_TIPO: Record<string, string> = {
  "image/png": "PNG",
  "image/jpeg": "JPG",
  "image/webp": "WEBP",
  "image/svg+xml": "SVG",
};

const FIRMAS: Record<string, (b: Uint8Array) => boolean> = {
  "image/png": (b) => b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  "image/jpeg": (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  // RIFF....WEBP — "WEBP" empieza en el byte 8 del header RIFF.
  "image/webp": (b) => b.length >= 12 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
};

export interface ResultadoValidacionImagen {
  ok: boolean;
  mensaje?: string;
  bytes?: ArrayBuffer;
  contentType?: string;
}

function etiquetaTipos(tipos: string[]): string {
  return tipos.map((t) => ETIQUETA_TIPO[t] ?? t).join(", ");
}

/**
 * Valida un File subido contra la lista de tipos permitidos, el tamaño
 * máximo y la firma real de bytes (o sanea el contenido si es SVG).
 * Devuelve los bytes listos para subir (ya saneados en el caso SVG) para
 * que la ruta nunca vuelva a leer el archivo original.
 */
export async function validarImagenSubida(
  archivo: File,
  tiposPermitidos: string[],
  etiqueta = "La imagen",
): Promise<ResultadoValidacionImagen> {
  if (archivo.size === 0) {
    return { ok: false, mensaje: `Falta ${etiqueta.toLowerCase()} a subir.` };
  }
  if (!tiposPermitidos.includes(archivo.type)) {
    return { ok: false, mensaje: `${etiqueta} debe ser ${etiquetaTipos(tiposPermitidos)}.` };
  }
  if (archivo.size > TAMANO_MAX_IMAGEN) {
    return { ok: false, mensaje: `${etiqueta} no puede superar ${TAMANO_MAX_IMAGEN / (1024 * 1024)}MB.` };
  }

  const bytes = await archivo.arrayBuffer();

  if (archivo.type === "image/svg+xml") {
    const saneado = sanearSvg(new TextDecoder().decode(bytes));
    if (saneado === null) {
      return { ok: false, mensaje: `${etiqueta}: el archivo SVG no es válido.` };
    }
    return { ok: true, bytes: new TextEncoder().encode(saneado).buffer, contentType: archivo.type };
  }

  const firma = FIRMAS[archivo.type];
  if (firma && !firma(new Uint8Array(bytes))) {
    return { ok: false, mensaje: `${etiqueta}: el contenido del archivo no coincide con su tipo.` };
  }

  return { ok: true, bytes, contentType: archivo.type };
}

/**
 * Saneo mínimo de SVG antes de guardarlo en el bucket público: se sacan
 * <script>, atributos on* (onload, onclick...) y href/xlink:href con
 * "javascript:". No es un parser XML completo — no hace falta uno para
 * este caso de uso (logos subidos por un admin, no una fuente adversarial
 * esperada), es una barrera contra "cuenta admin comprometida sube un SVG
 * con payload". null si el archivo ni siquiera parece un SVG.
 */
function sanearSvg(svg: string): string | null {
  if (!/<svg[\s>]/i.test(svg)) return null;
  return svg
    .replace(/<script[\s\S]*?<\/script\s*>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/((?:xlink:)?href)\s*=\s*"\s*javascript:[^"]*"/gi, "")
    .replace(/((?:xlink:)?href)\s*=\s*'\s*javascript:[^']*'/gi, "");
}
