// Candado de escritura para confirmar/revertir el catálogo publicado en
// Vercel Blob (ver lib/blob.ts) — evita que dos sesiones admin distintas
// confirmen/reviertan casi al mismo tiempo y se pisen el catálogo o el
// backup. Ver supabase/migrations/20260910120000_catalogo_lock.sql.
//
// Compare-and-swap sobre una sola fila (catalogo_lock): "tomar" es un
// UPDATE que solo aplica si la fila está libre (expira_en null o vencido)
// — Postgres serializa los UPDATEs concurrentes sobre la misma fila, así
// que dos requests casi simultáneos nunca pueden tomar el candado los dos.
// "Soltar" solo limpia la fila si el token todavía es el que devolvió esta
// misma llamada a adquirir — así un candado vencido que se libera tarde
// (función colgada) no borra el candado de quien lo tomó después.

import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const DURACION_MS = 30_000; // margen generoso: confirmar/revertir tardan <5s en el caso normal

export type OperacionCatalogo = "confirmar" | "revertir";

/** Intenta tomar el candado. Devuelve el token para liberarlo, o null si ya está tomado. */
export async function adquirirLockCatalogo(
  supabase: SupabaseClient,
  operacion: OperacionCatalogo,
): Promise<string | null> {
  const token = randomUUID();
  const ahora = new Date();
  const expiraEn = new Date(ahora.getTime() + DURACION_MS).toISOString();

  const { data, error } = await supabase
    .from("catalogo_lock")
    .update({ operacion, token, bloqueado_en: ahora.toISOString(), expira_en: expiraEn })
    .eq("id", true)
    .or(`expira_en.is.null,expira_en.lt.${ahora.toISOString()}`)
    .select("id");

  if (error) throw error;
  return (data?.length ?? 0) > 0 ? token : null;
}

/** Libera el candado — no-op si `token` ya no coincide (lo tomó otra operación tras vencer). */
export async function liberarLockCatalogo(supabase: SupabaseClient, token: string): Promise<void> {
  await supabase
    .from("catalogo_lock")
    .update({ operacion: null, token: null, bloqueado_en: null, expira_en: null })
    .eq("id", true)
    .eq("token", token);
}
