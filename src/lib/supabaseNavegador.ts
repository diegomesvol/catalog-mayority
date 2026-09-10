// Cliente de Supabase para Client Components — separado de lib/supabase.ts
// a propósito: ese archivo importa next/headers (solo servidor), y si un
// "use client" lo importa, Next arrastra next/headers al bundle del
// navegador y el build de Vercel falla ("You're importing a module that
// depends on next/headers"). Usar SIEMPRE este archivo desde código cliente
// (ej. app/admin/invitacion/page.tsx, que procesa el token de invitación).

import { createBrowserClient } from "@supabase/ssr";

function requireEnv(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta configurar ${nombre}`);
  return valor;
}

export function crearClienteNavegador() {
  return createBrowserClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
}
