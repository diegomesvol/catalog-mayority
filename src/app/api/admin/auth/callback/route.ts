import { NextRequest, NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase";
import { obtenerAdminActivo } from "@/lib/auth";
import { logError } from "@/lib/logger";

// Destino del "Continuar con Google" (ver LoginAdminForm.iniciarGoogle) —
// Supabase redirige acá con "?code=" después de que el admin autoriza en
// Google. Este intercambio (exchangeCodeForSession) tiene que correr en un
// Route Handler de servidor: es el único lugar que puede escribir las
// cookies de sesión antes de mandar el redirect final (mismo cliente que
// crearClienteServidor usa en todos lados, con next/headers de por medio).
//
// Vinculación de cuentas por email: no hay lógica propia acá — Supabase Auth
// ya vincula automáticamente una identidad nueva (Google) a un usuario
// existente si comparten el mismo email verificado (comportamiento nativo,
// "Automatic linking"). Si ese admin ya tenía una fila en admin_perfiles
// (creada cuando se le dio de alta con su clave), sigue siendo LA MISMA fila
// — mismo user_id — sin duplicados.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const origin = request.nextUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/admin/login?error=oauth`);
  }

  try {
    const supabase = await crearClienteServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      logError("api/admin/auth/callback exchangeCodeForSession", error);
      return NextResponse.redirect(`${origin}/admin/login?error=oauth`);
    }

    // Misma barrera que /api/admin/login: la sesión de Supabase Auth por sí
    // sola no alcanza, hace falta una fila activa en admin_perfiles. Sin
    // este chequeo, cualquier cuenta de Google (no solo admins dados de
    // alta) quedaría "logueada" acá.
    const admin = await obtenerAdminActivo(supabase);
    if (!admin) {
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/admin/login?error=sin_acceso`);
    }

    return NextResponse.redirect(`${origin}/admin`);
  } catch (err) {
    logError("api/admin/auth/callback", err);
    return NextResponse.redirect(`${origin}/admin/login?error=oauth`);
  }
}
