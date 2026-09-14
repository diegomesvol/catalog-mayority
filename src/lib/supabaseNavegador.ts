// Cliente de Supabase para Client Components — separado de lib/supabase.ts
// a propósito: ese archivo importa next/headers (solo servidor), y si un
// "use client" lo importa, Next arrastra next/headers al bundle del
// navegador y el build de Vercel falla ("You're importing a module that
// depends on next/headers"). Usar SIEMPRE este archivo desde código cliente
// (ej. app/admin/invitacion/page.tsx, que procesa el token de invitación).

import { createBrowserClient } from "@supabase/ssr";

// El acceso tiene que ser process.env.NEXT_PUBLIC_X (estático, con punto) —
// Next.js solo puede inlinear NEXT_PUBLIC_* en el bundle del navegador
// cuando detecta la referencia literal en build time. Un acceso dinámico
// (process.env[nombre]) no se puede inlinear: en el navegador `process.env`
// no existe en runtime, así que esa forma siempre da undefined sin importar
// el valor configurado en Vercel.
function requireEnv(nombre: string, valor: string | undefined): string {
  if (!valor) throw new Error(`Falta configurar ${nombre}`);
  return valor;
}

export function crearClienteNavegador() {
  return createBrowserClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}
