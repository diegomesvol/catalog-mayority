import { NextRequest, NextResponse } from "next/server";
import { crearClienteProxy } from "@/lib/supabase";
import { obtenerAdminActivo } from "@/lib/auth";

// Protege todo /admin/* y /api/admin/* excepto login e invitación. (Next.js
// 16 renombró "middleware" a "proxy"; misma función, nuevo nombre de
// archivo.) Runtime Edge — por eso crearClienteProxy (no crearClienteServidor,
// que depende de next/headers).
//
// /admin/invitacion tiene que ser pública: el token de invitación/recovery de
// Supabase llega en el FRAGMENTO de la URL (#access_token=...), que el
// navegador nunca envía al servidor — así que en la primera carga de esa
// página el proxy no tiene forma de ver ese token, todavía no hay sesión, y
// sin este permiso redirigiría a /admin/login antes de que el cliente llegue
// a procesarlo. La página en sí ya valida el token del lado del cliente y no
// muestra nada útil sin uno válido — dejarla pública no abre ningún hueco.
const RUTAS_PUBLICAS = ["/admin/login", "/api/admin/login", "/admin/invitacion"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (RUTAS_PUBLICAS.some((ruta) => pathname === ruta)) {
    return NextResponse.next();
  }

  // La response se crea ANTES de leer el admin y se devuelve al final: es
  // donde crearClienteProxy escribe el refresco de cookies de sesión de
  // Supabase — devolver una response distinta perdería ese refresco y
  // desloguearía al admin en cuanto el access token expire.
  const response = NextResponse.next();
  const supabase = crearClienteProxy(request, response);
  const admin = await obtenerAdminActivo(supabase);

  if (!admin) {
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json({ ok: false, mensaje: "No autenticado" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
