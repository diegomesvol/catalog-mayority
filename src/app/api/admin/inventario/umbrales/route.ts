import { NextRequest, NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase";
import { requierePermisoEscritura } from "@/lib/auth";
import { umbralStockSchema } from "@/lib/schemas/inventario";
import { guardarUmbralStock } from "@/lib/blob";
import { logError } from "@/lib/logger";

// Umbral de "bajo stock" de UN producto (Panel de Inventario) — el mapa
// completo se lee del lado del servidor en app/admin/inventario/page.tsx
// (leerUmbralesStock), así que acá solo hace falta el PUT: el cliente
// actualiza su propio estado local en cuanto esto responde ok, sin
// necesidad de una ruta GET aparte.
export async function PUT(request: NextRequest) {
  const supabase = await crearClienteServidor();
  const permiso = await requierePermisoEscritura(supabase, "catalogo");
  if (!permiso.ok) return permiso.respuesta;

  try {
    const body = await request.json().catch(() => null);
    const parsed = umbralStockSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, mensaje: parsed.error.issues[0].message }, { status: 400 });
    }
    await guardarUmbralStock(parsed.data.slug, parsed.data.umbral);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("api/admin/inventario/umbrales PUT", err);
    return NextResponse.json({ ok: false, mensaje: "No se pudo guardar el umbral de stock." }, { status: 500 });
  }
}
