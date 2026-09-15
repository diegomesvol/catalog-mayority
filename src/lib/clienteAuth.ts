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
  // Del usuario de Supabase Auth, no de la tabla `clientes` (no hay columna
  // propia para esto) — email siempre presente (requisito de Auth); avatar
  // solo si el cliente entró con Google (user_metadata.avatar_url/picture),
  // null con login por contraseña. Usados para el indicador de sesión en el
  // header público (ver CuentaClienteMenu) — nada de esto es un dato del
  // perfil de negocio, así que no vive en la tabla.
  email: string;
  avatarUrl: string | null;
  // Campos del onboarding (ver lib/schemas/perfilCliente.ts) — null hasta
  // que el cliente los completa. perfilCompleto es la columna generada
  // clientes.perfil_completo: una sola fuente de verdad, no se recalcula acá.
  logoUrl: string | null;
  telefono2: string | null;
  direccion: string | null;
  ciudad: string | null;
  estadoUbicacion: string | null;
  metodosPago: string[];
  perfilCompleto: boolean;
}

interface FilaClienteDB {
  nombre: string;
  empresa: string;
  telefono: string;
  rif: string;
  activo: boolean;
  logo_url: string | null;
  telefono_2: string | null;
  direccion: string | null;
  ciudad: string | null;
  estado_ubicacion: string | null;
  metodos_pago: string[];
  perfil_completo: boolean;
}

function mapearPerfilDesdeDB(fila: FilaClienteDB, email: string, avatarUrl: string | null): PerfilCliente {
  return {
    nombre: fila.nombre,
    empresa: fila.empresa,
    telefono: fila.telefono,
    rif: fila.rif,
    activo: fila.activo,
    logoUrl: fila.logo_url,
    telefono2: fila.telefono_2,
    direccion: fila.direccion,
    ciudad: fila.ciudad,
    estadoUbicacion: fila.estado_ubicacion,
    metodosPago: fila.metodos_pago ?? [],
    perfilCompleto: fila.perfil_completo,
    email,
    avatarUrl,
  };
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
    .select("nombre, empresa, telefono, rif, activo, logo_url, telefono_2, direccion, ciudad, estado_ubicacion, metodos_pago, perfil_completo")
    .eq("user_id", user.id)
    .maybeSingle();

  // Ver la nota equivalente en obtenerAdminActivo (lib/auth.ts): un error de
  // RLS/permiso acá no debe quedar indistinguible de "no es cliente".
  if (error) logError("obtenerClienteActivo", error);
  if (!perfil || !perfil.activo) return null;

  const avatarUrl = (user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null) as string | null;
  return mapearPerfilDesdeDB(perfil as FilaClienteDB, user.email ?? "", avatarUrl);
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
