import { NextRequest, NextResponse } from "next/server";
import { subirImagenLogoMarca } from "@/lib/blob";
import { logError, pistaBlob } from "@/lib/logger";
import { crearClienteServidor } from "@/lib/supabase";
import { requierePermisoEscritura } from "@/lib/auth";

// Calco de /api/admin/config/fondo-login (ver la nota ahí): endpoint aparte
// del que guarda el JSON completo — sube la imagen, devuelve la URL pública
// resultante y recién al "Guardar cambios" ConfiguracionForm la persiste en
// el campo logoUrl.
const TIPOS_IMAGEN_PERMITIDOS = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export async function POST(request: NextRequest) {
  try {
    const supabase = await crearClienteServidor();
    const permiso = await requierePermisoEscritura(supabase, "operativo");
    if (!permiso.ok) return permiso.respuesta;

    const formData = await request.formData();
    const archivo = formData.get("archivo");

    if (!(archivo instanceof File) || archivo.size === 0) {
      return NextResponse.json({ ok: false, mensaje: "Falta la imagen a subir." }, { status: 400 });
    }
    if (!TIPOS_IMAGEN_PERMITIDOS.includes(archivo.type)) {
      return NextResponse.json({ ok: false, mensaje: "El logo debe ser PNG, SVG, JPG o WEBP." }, { status: 400 });
    }
    // 2MB — mismo límite que se muestra como indicación en el panel.
    if (archivo.size > 2 * 1024 * 1024) {
      return NextResponse.json({ ok: false, mensaje: "El logo no puede superar 2MB." }, { status: 400 });
    }

    const bytes = await archivo.arrayBuffer();
    const url = await subirImagenLogoMarca(archivo.name || "logo", bytes, archivo.type);
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    const detalle = err instanceof Error ? err.message : String(err);
    logError("api/admin/config/logo POST", err, pistaBlob(detalle));
    return NextResponse.json({ ok: false, mensaje: "No se pudo subir el logo." }, { status: 500 });
  }
}
