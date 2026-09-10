import { NextRequest, NextResponse } from "next/server";
import { crearClienteProxy } from "@/lib/supabase";
import { obtenerAdminActivo } from "@/lib/auth";

// Protege todo /admin/* y /api/admin/* excepto la propia pantalla/endpoint de
// login. (Next.js 16 renombró "middleware" a "proxy"; misma función, nuevo
// nombre de archivo.) Runtime Edge — por eso crearClienteProxy (no
// crearClienteServidor, que depende de next/headers).
const RUTAS_PUBLICAS = ["/admin/login", "/api/admin/login"];

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
