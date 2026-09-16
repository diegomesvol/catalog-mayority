import { NextRequest, NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase";
import { requierePermisoEscritura } from "@/lib/auth";
import { agotarMasivoSchema } from "@/lib/schemas/inventario";
import { agotarTallasMasivo } from "@/lib/blob";
import { logError } from "@/lib/logger";

// Bulk action de la barra de selección múltiple del Panel de Inventario:
// pone en 0 el stock de TODAS las tallas de los productos seleccionados.
export async function POST(request: NextRequest) {
  const supabase = await crearClienteServidor();
  const permiso = await requierePermisoEscritura(supabase, "catalogo");
  if (!permiso.ok) return permiso.respuesta;

  try {
    const body = await request.json().catch(() => null);
    const parsed = agotarMasivoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, mensaje: parsed.error.issues[0].message }, { status: 400 });
    }
    await agotarTallasMasivo(parsed.data.tallaIds);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("api/admin/inventario/agotar-masivo POST", err);
    return NextResponse.json({ ok: false, mensaje: "No se pudo actualizar el stock de los productos seleccionados." }, { status: 500 });
  }
}
