import { NextResponse } from "next/server";
import { confirmarReemplazoCatalogo } from "@/lib/blob";
import { crearClienteServidor } from "@/lib/supabase";
import { adquirirLockCatalogo, liberarLockCatalogo } from "@/lib/catalogoLock";
import { logError, pistaBlob } from "@/lib/logger";

export async function POST() {
  const supabase = await crearClienteServidor();
  const token = await adquirirLockCatalogo(supabase, "confirmar");
  if (!token) {
    return NextResponse.json(
      { ok: false, mensaje: "Otra operación sobre el catálogo está en curso. Esperá unos segundos y probá de nuevo." },
      { status: 409 },
    );
  }

  try {
    const catalogo = await confirmarReemplazoCatalogo();
    return NextResponse.json({
      ok: true,
      totalProductos: catalogo.totalProductos,
      totalVariantes: catalogo.totalVariantes,
    });
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : "No se pudo confirmar el reemplazo.";
    logError("api/admin/confirm", err, pistaBlob(mensaje));
    return NextResponse.json({ ok: false, mensaje }, { status: 400 });
  } finally {
    await liberarLockCatalogo(supabase, token);
  }
}
