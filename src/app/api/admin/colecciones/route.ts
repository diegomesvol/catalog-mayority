import { NextRequest, NextResponse } from "next/server";
import { guardarColecciones, leerColecciones } from "@/lib/blob";
import { coleccionesSchema, limpiarColecciones } from "@/lib/schemas/colecciones";
import { logError, pistaBlob } from "@/lib/logger";
import { crearClienteServidor } from "@/lib/supabase";
import { requierePermisoEscritura } from "@/lib/auth";

// Mismo patrón que /api/admin/config: GET devuelve la lista guardada (o
// vacía si el admin todavía no configuró ninguna), POST reemplaza la lista
// entera con lo que llega del panel — el panel es quien maneja alta/edición/
// borrado/reorden como una sola lista en memoria y la guarda de una vez.

export async function GET() {
  try {
    const colecciones = await leerColecciones();
    return NextResponse.json({ ok: true, colecciones });
  } catch (err) {
    const detalle = err instanceof Error ? err.message : String(err);
    logError("api/admin/colecciones GET", err, pistaBlob(detalle));
    return NextResponse.json({ ok: false, mensaje: "No se pudieron leer las colecciones." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await crearClienteServidor();
    const permiso = await requierePermisoEscritura(supabase, "operativo");
    if (!permiso.ok) return permiso.respuesta;

    const body = await request.json().catch(() => null);
    const parsed = coleccionesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, mensaje: parsed.error.issues[0].message }, { status: 400 });
    }

    const colecciones = limpiarColecciones(body);
    await guardarColecciones(colecciones);
    return NextResponse.json({ ok: true, colecciones });
  } catch (err) {
    const detalle = err instanceof Error ? err.message : String(err);
    logError("api/admin/colecciones POST", err, pistaBlob(detalle));
    return NextResponse.json({ ok: false, mensaje: "No se pudieron guardar las colecciones." }, { status: 500 });
  }
}
