// Autenticación de administradores vía Supabase Auth + tabla admin_perfiles
// (rol y estado activo) — ver supabase/migrations/20260910000000_init_schema.sql.
// Reemplaza la sesión HMAC de un solo admin: ahora cada admin tiene su
// propia cuenta (auth.users) y una fila en admin_perfiles que decide si
// puede entrar (activo) y con qué rol.

import type { SupabaseClient } from "@supabase/supabase-js";

export type RolAdmin = "superadmin" | "admin" | "editor";

export interface PerfilAdmin {
  nombre: string;
  rol: RolAdmin;
  activo: boolean;
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
    .select("nombre, rol, activo")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!perfil || !perfil.activo) return null;
  return perfil as PerfilAdmin;
}
