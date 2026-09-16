import { NextRequest, NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase";
import { requierePermisoEscritura } from "@/lib/auth";
import { actualizarTallaSchema } from "@/lib/schemas/inventario";
import { actualizarStockTalla } from "@/lib/blob";
import { logError } from "@/lib/logger";

// Edición rápida de stock desde el modal del Panel de Inventario — UPDATE
// directo sobre la carga activa (ver la nota grande en lib/blob.ts). Mismo
// permiso que reemplazar el catálogo ("catalogo"): es el mismo dominio de
// datos, y el editor/demo no debe poder tocar stock igual que no puede
// reemplazar el catálogo entero.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await crearClienteServidor();
  const permiso = await requierePermisoEscritura(supabase, "catalogo");
  if (!permiso.ok) return permiso.respuesta;

  try {
    const body = await request.json().catch(() => null);
    const parsed = actualizarTallaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, mensaje: parsed.error.issues[0].message }, { status: 400 });
    }
    await actualizarStockTalla(id, parsed.data.disponible, parsed.data.disponibleFisico);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("api/admin/inventario/talla/[id] PATCH", err);
    return NextResponse.json({ ok: false, mensaje: "No se pudo actualizar el stock." }, { status: 500 });
  }
}
