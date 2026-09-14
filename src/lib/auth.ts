// Autenticación de administradores vía Supabase Auth + tabla admin_perfiles
// (rol y estado activo) — ver supabase/migrations/20260910000000_init_schema.sql.
// Reemplaza la sesión HMAC de un solo admin: ahora cada admin tiene su
// propia cuenta (auth.users) y una fila en admin_perfiles que decide si
// puede entrar (activo) y con qué rol.

import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export type RolAdmin = "superadmin" | "admin" | "editor";

export interface PerfilAdmin {
  nombre: string;
  rol: RolAdmin;
  activo: boolean;
  // Modo demo: independiente del rol (ver migración
  // 20260914000000_rbac_demo_clientes_pedidos.sql) — una cuenta puede tener
  // rol 'admin' (ve todo) pero con esto en true no puede guardar nada.
  solo_lectura: boolean;
}

/**
 * Perfil del admin autenticado en esta sesión, o null si no hay sesión
 * válida, no tiene fila en admin_perfiles, o está desactivado. getUser()
 * (no getSession()) valida el token contra el servidor de Supabase en vez
 * de solo decodificarlo — es lo recomendado para código de servidor.
 */
export async function obtenerAdminActivo(supabase: SupabaseClient): Promise<PerfilAdmin | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase
    .from("admin_perfiles")
    .select("nombre, rol, activo, solo_lectura")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!perfil || !perfil.activo) return null;
  return perfil as PerfilAdmin;
}

// Mismas reglas que las funciones puede_escribir_catalogo()/
// puede_escribir_operativo() del lado de la base (RLS) — acá se repiten
// porque hoy el catálogo/colecciones/config todavía viven en Vercel Blob,
// no en Postgres, así que RLS no los protege: esta es la única barrera real
// para esas rutas hasta que se adopte la migración a Postgres.
export function puedeEscribirCatalogo(perfil: PerfilAdmin): boolean {
  return !perfil.solo_lectura && (perfil.rol === "admin" || perfil.rol === "superadmin");
}

export function puedeEscribirOperativo(perfil: PerfilAdmin): boolean {
  return !perfil.solo_lectura;
}

/**
 * Chequeo de permiso para el POST/mutación de una ruta admin — llamar al
 * principio del handler, antes de tocar Blob/Postgres. `tipo` distingue
 * "catalogo" (cargar/confirmar/revertir — bloqueado para editor y demo) de
 * "operativo" (colecciones/config/guía de tallas — cualquier admin activo
 * salvo demo). Cuando el bloqueo es por modo demo, la respuesta lleva
 * `demo: true` — es la señal que el front (fetchJson en apiCliente.ts) usa
 * para mostrar el modal de aviso en vez de solo un toast de error.
 */
export async function requierePermisoEscritura(
  supabase: SupabaseClient,
  tipo: "catalogo" | "operativo",
): Promise<{ ok: true; perfil: PerfilAdmin } | { ok: false; respuesta: NextResponse }> {
  const perfil = await obtenerAdminActivo(supabase);
  if (!perfil) {
    return { ok: false, respuesta: NextResponse.json({ ok: false, mensaje: "No autenticado." }, { status: 401 }) };
  }

  const permitido = tipo === "catalogo" ? puedeEscribirCatalogo(perfil) : puedeEscribirOperativo(perfil);
  if (permitido) return { ok: true, perfil };

  if (perfil.solo_lectura) {
    return {
      ok: false,
      respuesta: NextResponse.json(
        { ok: false, mensaje: "Estás en modo demostración — no se pueden guardar cambios.", demo: true },
        { status: 403 },
      ),
    };
  }
  return {
    ok: false,
    respuesta: NextResponse.json({ ok: false, mensaje: "Tu rol no tiene permiso para esta acción." }, { status: 403 }),
  };
}
