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

// Copia las cookies que Supabase escribió en `origen` (refresh/signOut) a
// una response distinta (redirect/json) — sin esto se pierden.
function conCookiesDe(origen: NextResponse, destino: NextResponse): NextResponse {
  origen.cookies.getAll().forEach((cookie) => destino.cookies.set(cookie));
  return destino;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // La response se crea ANTES de leer el perfil y se devuelve al final: es
  // donde crearClienteProxy escribe el refresco de cookies de sesión de
  // Supabase — devolver una response distinta perdería ese refresco y
  // desloguearía a la sesión en cuanto el access token expire.
  const response = NextResponse.next();
  const supabase = crearClienteProxy(request, response);

  if (RUTAS_PUBLICAS.some((ruta) => pathname === ruta)) {
    // Login con una sesión YA válida para ese portal → directo al panel, en
    // vez de mostrar el formulario (antes el cliente logueado que tocaba
    // "Ingresar" desde un link viejo volvía a ver el login).
    if (pathname === "/cliente/login" || pathname === "/admin/login") {
      const esLoginCliente = pathname === "/cliente/login";
      const perfilActual = esLoginCliente ? await obtenerClienteActivo(supabase) : await obtenerAdminActivo(supabase);
      if (perfilActual) {
        const url = request.nextUrl.clone();
        url.pathname = esLoginCliente ? "/cliente" : "/admin";
        url.search = "";
        return conCookiesDe(response, NextResponse.redirect(url));
      }
      return response;
    }
    // Igual se refresca (ver la nota grande de abajo) — puede llegar acá con
    // una cookie de sesión vencida (ej. volviendo al login desde el catálogo).
    await supabase.auth.getUser();
    return response;
  }

  const esArbolCliente = pathname.startsWith("/cliente") || pathname.startsWith("/api/cliente");
  const esArbolAdmin = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");

  // BUG DE SESIÓN "FANTASMA" (cliente logueado al que "Mi cuenta" mandaba al
  // login pese a tener sesión activa): este proxy antes solo corría sobre
  // /admin y /cliente (ver el matcher de abajo, ensanchado ahora). Mientras
  // un cliente mayorista navegaba el catálogo público, NADA refrescaba su
  // sesión de Supabase ahí: los Server Components (RootLayout, Header) no
  // pueden escribir cookies (ver la nota en crearClienteServidor,
  // lib/supabase.ts) y eran el ÚNICO lugar que consultaba la sesión en esas
  // páginas. Cuando el access token vencía, dos Server Components del MISMO
  // request (RootLayout y Header, cada uno con su propio cliente de
  // Supabase) disparaban su propio refresh EN PARALELO usando el mismo
  // refresh token — de un solo uso, rota en cada refresh. El primero lo
  // consumía y renovaba contra el servidor de Supabase, pero no podía
  // guardar esa rotación (no hay dónde escribir cookies desde un Server
  // Component); el segundo llegaba con el refresh token viejo, YA usado, y
  // fallaba. Resultado: la sesión quedaba muerta en el navegador (con un
  // refresh token ya inválido) mientras el cliente todavía "se veía"
  // logueado en el header de esa misma carga — y explotaba recién al entrar
  // a /cliente, la primera ruta que sí pasaba por acá, que interpretaba "no
  // hay sesión" y mandaba al login.
  //
  // La corrección real es ensanchar el matcher para que este proxy corra en
  // TODA la app (ver export const config abajo) y refrescar acá — el único
  // lugar que SÍ puede persistir el refresh (via response.cookies) — para
  // cualquier ruta fuera de los dos árboles protegidos, sin exigirles
  // sesión. Con el token siempre al día antes de que corra cualquier Server
  // Component, ya no hay dos refrescos compitiendo por el mismo refresh
  // token: cuando RootLayout/Header llaman a getUser() por su cuenta más
  // abajo en el árbol, el token ya está fresco y esa llamada es una simple
  // validación, no un refresh.
  if (!esArbolCliente && !esArbolAdmin) {
    await supabase.auth.getUser();
    return response;
  }

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
    // Admin y cliente comparten la MISMA sesión de Supabase: antes se hacía
    // signOut() siempre, así que un cliente que entraba a /admin (o un admin
    // a /cliente) perdía su propia sesión válida del otro portal. Solo se
    // revoca si la cuenta no tiene acceso a NINGUNO de los dos.
    if (user) {
      const perfilOtroPortal = esArbolCliente ? await obtenerAdminActivo(supabase) : await obtenerClienteActivo(supabase);
      if (!perfilOtroPortal) await supabase.auth.signOut();
    }

    // signOut() (y el refresco normal de sesión) escribieron sus cookies en
    // `response` vía crearClienteProxy — pero acá abajo se devuelve un
    // response DISTINTO (redirect o json). Sin copiar esas cookies se
    // pierden y la sesión queda "viva" en el navegador pese al signOut.
    const conCookies = (destino: NextResponse) => conCookiesDe(response, destino);

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
  // Antes solo cubría /admin y /cliente — ver la nota grande de arriba sobre
  // por qué eso dejaba el catálogo público sin refresco de sesión. Ahora
  // corre en toda la app salvo assets estáticos (mismo patrón que recomienda
  // Next.js para middleware global) — la lógica de arriba sigue exigiendo
  // sesión solo para /admin y /cliente, el resto solo refresca el token.
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|xml|txt|webmanifest)$).*)"],
};
