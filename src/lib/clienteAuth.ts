// Autenticación de clientes (mayoristas con cuenta propia) vía Supabase
// Auth + tabla `clientes` — mismo patrón que lib/auth.ts para admins, pero
// aparte a propósito: un cliente no es "un admin con menos permisos", es
// una entidad distinta (ver supabase/migrations/20260914000000_...).

import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { logError } from "./logger";

export interface PerfilCliente {
  nombre: string;
  empresa: string;
  telefono: string;
  rif: string;
  activo: boolean;
}

/**
 * Perfil del cliente autenticado en esta sesión, o null si no hay sesión
 * válida, no tiene fila en `clientes`, o está desactivado. Mismo motivo que
 * obtenerAdminActivo: getUser() valida el token contra el servidor de
 * Supabase en vez de solo decodificarlo.
 */
export async function obtenerClienteActivo(supabase: SupabaseClient): Promise<PerfilCliente | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil, error } = await supabase
    .from("clientes")
    .select("nombre, empresa, telefono, rif, activo")
    .eq("user_id", user.id)
    .maybeSingle();

  // Ver la nota equivalente en obtenerAdminActivo (lib/auth.ts): un error de
  // RLS/permiso acá no debe quedar indistinguible de "no es cliente".
  if (error) logError("obtenerClienteActivo", error);
  if (!perfil || !perfil.activo) return null;
  return perfil as PerfilCliente;
}

/** Igual que requierePermisoEscritura (lib/auth.ts) pero para rutas /api/cliente/*. */
export async function requiereClienteActivo(
  supabase: SupabaseClient,
): Promise<{ ok: true; perfil: PerfilCliente } | { ok: false; respuesta: NextResponse }> {
  const perfil = await obtenerClienteActivo(supabase);
  if (!perfil) {
    return { ok: false, respuesta: NextResponse.json({ ok: false, mensaje: "No autenticado." }, { status: 401 }) };
  }
  return { ok: true, perfil };
}
