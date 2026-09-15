import { NextRequest, NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase";
import { obtenerClienteActivo } from "@/lib/clienteAuth";
import { logError } from "@/lib/logger";

// Destino del "Continuar con Google" del portal de cliente (ver
// LoginClienteForm.iniciarGoogle) — calco de api/admin/auth/callback, pero
// valida contra `clientes` (obtenerClienteActivo) en vez de admin_perfiles:
// son dos árboles de sesión independientes (ver la nota en clienteAuth.ts),
// así que una cuenta de Google que SÍ es admin pero no tiene fila en
// `clientes` no debe quedar "logueada" acá, y viceversa.
//
// Vinculación de cuentas por email: mismo comportamiento nativo de Supabase
// Auth que el callback de admin — si el mayorista ya tenía una fila en
// `clientes` (dada de alta con su clave), Google se vincula a ESE mismo
// user_id por email verificado, sin duplicar la cuenta.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const origin = request.nextUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/cliente/login?error=oauth`);
  }

  try {
    const supabase = await crearClienteServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      logError("api/cliente/auth/callback exchangeCodeForSession", error);
      return NextResponse.redirect(`${origin}/cliente/login?error=oauth`);
    }

    // Misma barrera que /api/cliente/login: la sesión de Supabase Auth por
    // sí sola no alcanza, hace falta una fila activa en `clientes`. Sin este
    // chequeo, cualquier cuenta de Google (no solo mayoristas dados de alta)
    // quedaría "logueada" acá.
    const cliente = await obtenerClienteActivo(supabase);
    if (!cliente) {
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/cliente/login?error=sin_acceso`);
    }

    return NextResponse.redirect(`${origin}/cliente`);
  } catch (err) {
    logError("api/cliente/auth/callback", err);
    return NextResponse.redirect(`${origin}/cliente/login?error=oauth`);
  }
}
