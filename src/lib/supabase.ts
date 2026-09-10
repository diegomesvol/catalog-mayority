// Clientes de Supabase para App Router. Reemplaza gradualmente la sesión
// HMAC de admin único (src/lib/auth.ts) por Supabase Auth + admin_perfiles
// (ver supabase/migrations/20260910000000_init_schema.sql).
//
// - crearClienteServidor: Server Components / Route Handlers (runtime Node),
//   lee/escribe cookies vía next/headers.
// - crearClienteProxy: src/proxy.ts (runtime Edge), lee/escribe cookies
//   directo sobre request/response — next/headers no aplica ahí.
// - crearClienteServicio: rol de servicio (bypassa RLS). Solo para scripts
//   o rutas admin de servidor; nunca exponer al cliente.

import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";

function requireEnv(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta configurar ${nombre}`);
  return valor;
}

const SUPABASE_URL = () => requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_ANON_KEY = () => requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

export async function crearClienteServidor() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Component: no puede escribir cookies. crearClienteProxy
          // en el proxy se encarga de refrescar la sesión en cada request.
        }
      },
    },
  });
}

export function crearClienteProxy(request: NextRequest, response: NextResponse) {
  return createServerClient(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
}

// Para Client Components — necesario para procesar el link de invitación/
// recuperación de Supabase, que entrega el token en el fragmento de la URL
// (#access_token=...), solo legible del lado del navegador. Sincroniza la
// sesión en cookies (vía @supabase/ssr) para que el servidor la vea después.
export function crearClienteNavegador() {
  return createBrowserClient(SUPABASE_URL(), SUPABASE_ANON_KEY());
}

export function crearClienteServicio() {
  return createClient(SUPABASE_URL(), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
