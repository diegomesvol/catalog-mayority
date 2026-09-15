// Esquema de la contraseña nueva (invitación/recuperación) — refleja la
// política configurada en Supabase (Authentication -> Policies -> Password
// requirements): mínimo 8 caracteres, mayúscula, minúscula, número y
// símbolo. Si esa política cambia en Supabase, actualizar acá también para
// que el error se vea en el formulario y no recién al enviar.

import { z } from "zod";

export const definirPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Mínimo 8 caracteres.")
      .regex(/[a-z]/, "Necesita al menos una minúscula.")
      .regex(/[A-Z]/, "Necesita al menos una mayúscula.")
      .regex(/[0-9]/, "Necesita al menos un número.")
      .regex(/[^a-zA-Z0-9]/, "Necesita al menos un símbolo especial."),
    confirmar: z.string(),
  })
  .refine((datos) => datos.password === datos.confirmar, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmar"],
  });

export type DefinirPasswordInput = z.infer<typeof definirPasswordSchema>;
