// Esquema de /api/admin/logos-footer — calco de schemas/colecciones.ts
// (mismo patrón: superRefine sobre unknown + limpiarLogosFooter recién tras
// un safeParse exitoso), con la regla extra de "entre 1 y 4 logos" que pide
// el panel — colecciones no tiene tope, esto sí.

import { z } from "zod";
import type { LogoFooter } from "@/lib/types";

export const MIN_LOGOS_FOOTER = 1;
export const MAX_LOGOS_FOOTER = 4;

export const logosFooterSchema = z.unknown().superRefine((body, ctx) => {
  if (!Array.isArray(body)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Se esperaba una lista de logos." });
    return;
  }

  if (body.length < MIN_LOGOS_FOOTER) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Tiene que haber al menos ${MIN_LOGOS_FOOTER} logo.` });
  }
  if (body.length > MAX_LOGOS_FOOTER) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Máximo ${MAX_LOGOS_FOOTER} logos.` });
  }

  const idsVistos = new Set<string>();
  body.forEach((item, i) => {
    if (!item || typeof item !== "object") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Cada logo debe ser un objeto.", path: [i] });
      return;
    }
    const { id, nombre, imagenUrl, visible } = item as Record<string, unknown>;

    if (typeof id !== "string" || !id.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Falta el id de algún logo.", path: [i, "id"] });
    } else if (idsVistos.has(id)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Id de logo repetido: "${id}".`, path: [i, "id"] });
    } else {
      idsVistos.add(id);
    }

    if (typeof nombre !== "string" || !nombre.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Todo logo necesita un nombre (ej. la marca que representa).", path: [i, "nombre"] });
    }

    if (imagenUrl !== null && typeof imagenUrl !== "string") {
      const etiqueta = typeof nombre === "string" && nombre.trim() ? nombre : "este logo";
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `"${etiqueta}": la imagen no tiene un formato válido.`, path: [i, "imagenUrl"] });
    } else if (typeof imagenUrl === "string" && imagenUrl.trim() === "") {
      const etiqueta = typeof nombre === "string" && nombre.trim() ? nombre : "este logo";
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `"${etiqueta}": falta subir la imagen.`, path: [i, "imagenUrl"] });
    }

    if (typeof visible !== "boolean") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Falta el estado de visibilidad de algún logo.", path: [i, "visible"] });
    }
  });
});

interface LogoFooterCrudo {
  id: string;
  nombre: string;
  imagenUrl: string | null;
  visible: boolean;
}

/** Solo llamar tras un safeParse exitoso de logosFooterSchema — asume que la forma ya es válida. */
export function limpiarLogosFooter(body: unknown): LogoFooter[] {
  const lista = body as LogoFooterCrudo[];
  return lista.map(({ id, nombre, imagenUrl, visible }) => ({
    id: id.trim(),
    nombre: nombre.trim(),
    imagenUrl: imagenUrl || null,
    visible,
  }));
}
