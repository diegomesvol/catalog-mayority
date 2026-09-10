// Esquema único de validación del login de admin — compartido entre el
// formulario (app/admin/login/page.tsx) y la API (api/admin/login/route.ts)
// para no duplicar reglas entre cliente y servidor.

import { z } from "zod";

export const loginAdminSchema = z.object({
  email: z.string().trim().min(1, "Falta el email.").email("El email no es válido."),
  password: z.string().min(1, "Falta la contraseña."),
});

export type LoginAdminInput = z.infer<typeof loginAdminSchema>;
