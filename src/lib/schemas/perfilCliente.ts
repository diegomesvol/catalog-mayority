// Esquema de PATCH /api/cliente/perfil — los campos "nuevos" del onboarding
// (ver supabase/migrations, columna clientes.perfil_completo). nombre/
// empresa/telefono/rif ya se piden en la invitación (api/admin/clientes) y
// no se re-piden acá: este endpoint solo completa lo que falta.

import { z } from "zod";

// Mismo orden en que se muestran en el formulario y en el generated column
// perfil_completo — si se agrega una opción acá, agregarla también ahí.
export const METODOS_PAGO_OPCIONES = ["transferencia", "pago_movil", "zelle", "efectivo", "usdt"] as const;
export type MetodoPago = (typeof METODOS_PAGO_OPCIONES)[number];

export const METODOS_PAGO_ETIQUETA: Record<MetodoPago, string> = {
  transferencia: "Transferencia bancaria",
  pago_movil: "Pago móvil",
  zelle: "Zelle",
  efectivo: "Efectivo",
  usdt: "USDT / Cripto",
};

export const actualizarPerfilClienteSchema = z.object({
  telefono2: z.string().trim().min(1, "Falta el segundo teléfono."),
  direccion: z.string().trim().min(1, "Falta la dirección de envío."),
  ciudad: z.string().trim().min(1, "Falta la ciudad."),
  estadoUbicacion: z.string().trim().min(1, "Falta el estado."),
  metodosPago: z.array(z.enum(METODOS_PAGO_OPCIONES)).min(1, "Elegí al menos un método de pago."),
  logoUrl: z.string().trim().min(1).nullable().optional(),
});

export type ActualizarPerfilClienteInput = z.infer<typeof actualizarPerfilClienteSchema>;
