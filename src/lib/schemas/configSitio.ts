// Esquema de /api/admin/config — reutiliza las mismas reglas que ya usa el
// formulario (ConfiguracionForm) vía validarConfigSitio: un solo lugar
// decide qué es válido, esto solo le da la forma de Zod que usa el resto de
// la API (parse/safeParse + mensaje de error por campo).

import { z } from "zod";
import { validarConfigSitio, type CamposConfigSitio } from "@/lib/validarConfigSitio";

// Campos "libres": si no vienen como string (falta el campo, o el cliente
// mandó otra cosa), se tratan como vacío — igual que el chequeo manual que
// reemplaza (`typeof body.x === "string" ? body.x.trim() : ""`), no como un
// error de validación.
const campoTexto = z.unknown().transform((valor) => (typeof valor === "string" ? valor.trim() : ""));

export const configSitioSchema = z
  .object({
    whatsappVentas: campoTexto,
    descripcionEmpresa: campoTexto,
    rif: campoTexto,
  })
  .superRefine((campos: CamposConfigSitio, ctx) => {
    const errores = validarConfigSitio(campos);
    for (const [campo, mensaje] of Object.entries(errores)) {
      if (mensaje) ctx.addIssue({ code: z.ZodIssueCode.custom, message: mensaje, path: [campo] });
    }
  });

export type ConfigSitioInput = z.infer<typeof configSitioSchema>;
