import { NextRequest, NextResponse } from "next/server";
import { guardarLogosFooter, leerLogosFooter } from "@/lib/blob";
import { logosFooterSchema, limpiarLogosFooter } from "@/lib/schemas/logosFooter";
import { logError, pistaBlob } from "@/lib/logger";
import { crearClienteServidor } from "@/lib/supabase";
import { requierePermisoEscritura } from "@/lib/auth";

// Calco de /api/admin/colecciones: GET devuelve la lista guardada, POST
// reemplaza la lista entera con lo que llega del panel (alta/edición/
// borrado/reorden se manejan como una sola lista en memoria del lado del
// cliente — ver useLogosFooterAdmin).
export async function GET() {
  try {
    const logos = await leerLogosFooter();
    return NextResponse.json({ ok: true, logos });
  } catch (err) {
    const detalle = err instanceof Error ? err.message : String(err);
    logError("api/admin/logos-footer GET", err, pistaBlob(detalle));
    return NextResponse.json({ ok: false, mensaje: "No se pudieron leer los logos." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await crearClienteServidor();
    const permiso = await requierePermisoEscritura(supabase, "operativo");
    if (!permiso.ok) return permiso.respuesta;

    const body = await request.json().catch(() => null);
    const parsed = logosFooterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, mensaje: parsed.error.issues[0].message }, { status: 400 });
    }

    const logos = limpiarLogosFooter(body);
    await guardarLogosFooter(logos);
    return NextResponse.json({ ok: true, logos });
  } catch (err) {
    const detalle = err instanceof Error ? err.message : String(err);
    logError("api/admin/logos-footer POST", err, pistaBlob(detalle));
    return NextResponse.json({ ok: false, mensaje: "No se pudieron guardar los logos." }, { status: 500 });
  }
}
