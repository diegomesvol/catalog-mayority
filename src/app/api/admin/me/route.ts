import { NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase";
import { obtenerAdminActivo } from "@/lib/auth";

// Perfil del admin logueado (nombre/rol/solo_lectura) — lo usa AdminHeader
// para mostrar el badge de "modo demostración". No hace falta más que esto:
// el proxy ya garantiza que si se llega hasta acá hay una sesión válida,
// pero el perfil (rol/solo_lectura) no viaja solo con la cookie.
export async function GET() {
  const supabase = await crearClienteServidor();
  const perfil = await obtenerAdminActivo(supabase);
  if (!perfil) {
    return NextResponse.json({ ok: false, mensaje: "No autenticado." }, { status: 401 });
  }
  return NextResponse.json({ ok: true, perfil });
}
