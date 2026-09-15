import { NextRequest, NextResponse } from "next/server";
import { crearClienteProxy } from "@/lib/supabase";
import { obtenerAdminActivo } from "@/lib/auth";
import { obtenerClienteActivo } from "@/lib/clienteAuth";

// Protege /admin/* + /api/admin/* Y /cliente/* + /api/cliente/* (dos árboles
// de sesión independientes — un login de cliente no sirve para /admin y
// viceversa). (Next.js 16 renombró "middleware" a "proxy"; misma función,
// nuevo nombre de archivo.) Runtime Edge — por eso crearClienteProxy (no
// crearClienteServidor, que depende de next/headers).
//
// /admin/invitacion y /cliente/invitacion tienen que ser públicas: el token
// de invitación/recovery de Supabase llega en el FRAGMENTO de la URL
// (#access_token=...), que el navegador nunca envía al servidor — así que en
// la primera carga de esas páginas el proxy no tiene forma de ver ese token,
// todavía no hay sesión, y sin este permiso redirigiría al login antes de que
// el cliente llegue a procesarlo. Las páginas en sí ya validan el token del
// lado del navegador y no muestran nada útil sin uno válido — dejarlas
// públicas no abre ningún hueco.
const RUTAS_PUBLICAS = [
  "/admin/login",
  "/api/admin/login",
  // Recibe el "code" de Google y hace exchangeCodeForSession — es la ruta
  // que CREA la sesión, así que no puede exigir una sesión ya activa (el
  // propio handler valida el code y el perfil admin antes de dejar pasar).
  "/api/admin/auth/callback",
  "/admin/invitacion",
  "/cliente/login",
  "/api/cliente/login",
  // Mismo motivo que /api/admin/auth/callback — ver la nota ahí.
  "/api/cliente/auth/callback",
  "/cliente/invitacion",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (RUTAS_PUBLICAS.some((ruta) => pathname === ruta)) {
    return NextResponse.next();
  }

  const esArbolCliente = pathname.startsWith("/cliente") || pathname.startsWith("/api/cliente");

  // La response se crea ANTES de leer el perfil y se devuelve al final: es
  // donde crearClienteProxy escribe el refresco de cookies de sesión de
  // Supabase — devolver una response distinta perdería ese refresco y
  // desloguearía a la sesión en cuanto el access token expire.
  const response = NextResponse.next();
  const supabase = crearClienteProxy(request, response);
  const perfil = esArbolCliente ? await obtenerClienteActivo(supabase) : await obtenerAdminActivo(supabase);

  if (!perfil) {
    // obtenerAdminActivo/obtenerClienteActivo devuelven null tanto si no hay
    // sesión como si la hay pero sin fila activa (no invitado, desactivado).
    // Ese segundo caso es una sesión de Supabase Auth "colgada" — sin esto
    // quedaría redirigiendo al login en bucle sin explicar por qué. Se
    // revoca acá mismo (no solo en las rutas de login) para cubrir también
    // el acceso directo por URL con una sesión ya inválida.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) await supabase.auth.signOut();

    // signOut() (y el refresco normal de sesión) escribieron sus cookies en
    // `response` vía crearClienteProxy — pero acá abajo se devuelve un
    // response DISTINTO (redirect o json). Sin copiar esas cookies se
    // pierden y la sesión queda "viva" en el navegador pese al signOut.
    const conCookies = (destino: NextResponse) => {
      response.cookies.getAll().forEach((cookie) => destino.cookies.set(cookie));
      return destino;
    };

    if (pathname.startsWith("/api/")) {
      return conCookies(
        NextResponse.json({ ok: false, mensaje: "No autenticado.", codigo: user ? "SIN_ACCESO" : undefined }, { status: 401 }),
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = esArbolCliente ? "/cliente/login" : "/admin/login";
    url.searchParams.set("next", pathname);
    if (user) url.searchParams.set("error", "sin_acceso");
    return conCookies(NextResponse.redirect(url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/cliente/:path*", "/api/cliente/:path*"],
};
