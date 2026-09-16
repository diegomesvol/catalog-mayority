// Esquema de POST /api/admin/clientes (invitar) — comparte estilo con
// configSitio.ts/colecciones.ts: reglas simples, mensajes en español, un
// solo lugar decide qué es válido.

import { z } from "zod";

export const invitarClienteSchema = z.object({
  email: z.string().trim().min(1, "Falta el email.").email("El email no es válido."),
  nombre: z.string().trim().min(1, "Falta el nombre."),
  empresa: z.string().trim().min(1, "Falta la empresa."),
  telefono: z.string().trim().min(1, "Falta el teléfono."),
  rif: z.string().trim().min(1, "Falta el RIF."),
});

export type InvitarClienteInput = z.infer<typeof invitarClienteSchema>;
