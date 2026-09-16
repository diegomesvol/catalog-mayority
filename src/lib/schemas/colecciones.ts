// Esquema de /api/admin/colecciones — mismas reglas que antes se validaban
// a mano en el route handler (validarYLimpiar), ahora centralizadas acá.
// coleccionesSchema SOLO valida forma y reglas (ids únicos, nombre
// obligatorio, imagenUrl bien tipada); limpiarColecciones() arma la lista
// final (trim, filtro limpio) y se llama recién después de un safeParse
// exitoso — así nunca corre sobre datos que todavía no se sabe que son
// válidos.

import { z } from "zod";
import type { Coleccion, FiltroColeccion } from "@/lib/types";

const CAMPOS_FILTRO = ["marca", "categoria", "linea", "genero", "color"] as const;

export const coleccionesSchema = z.unknown().superRefine((body, ctx) => {
  if (!Array.isArray(body)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Se esperaba una lista de colecciones." });
    return;
  }

  const idsVistos = new Set<string>();
  body.forEach((item, i) => {
    if (!item || typeof item !== "object") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Cada colección debe ser un objeto.", path: [i] });
      return;
    }
    const { id, nombre, imagenUrl } = item as Record<string, unknown>;

    if (typeof id !== "string" || !id.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Falta el id de alguna colección.", path: [i, "id"] });
    } else if (idsVistos.has(id)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Id de colección repetido: "${id}".`, path: [i, "id"] });
    } else {
      idsVistos.add(id);
    }

    if (typeof nombre !== "string" || !nombre.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Toda colección necesita un nombre.", path: [i, "nombre"] });
    }

    if (imagenUrl !== null && typeof imagenUrl !== "string") {
      const etiqueta = typeof nombre === "string" && nombre.trim() ? nombre : "esta colección";
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `"${etiqueta}": la imagen no tiene un formato válido.`,
        path: [i, "imagenUrl"],
      });
    }
  });
});

interface ColeccionCruda {
  id: string;
  nombre: string;
  imagenUrl: string | null;
  filtro?: unknown;
}

function limpiarFiltro(valor: unknown): FiltroColeccion {
  const filtro: FiltroColeccion = {};
  if (!valor || typeof valor !== "object") return filtro;
  const obj = valor as Record<string, unknown>;
  for (const campo of CAMPOS_FILTRO) {
    const v = obj[campo];
    if (typeof v === "string" && v.trim()) filtro[campo] = v.trim();
  }
  return filtro;
}

/** Solo llamar tras un safeParse exitoso de coleccionesSchema — asume que la forma ya es válida. */
export function limpiarColecciones(body: unknown): Coleccion[] {
  const lista = body as ColeccionCruda[];
  return lista.map(({ id, nombre, imagenUrl, filtro }) => ({
    id: id.trim(),
    nombre: nombre.trim(),
    imagenUrl: imagenUrl || null,
    filtro: limpiarFiltro(filtro),
  }));
}
