import { NextRequest, NextResponse } from "next/server";
import { subirImagenLogoFooter } from "@/lib/blob";
import { logError, pistaBlob } from "@/lib/logger";
import { crearClienteServidor } from "@/lib/supabase";
import { requierePermisoEscritura } from "@/lib/auth";

// Endpoint aparte del de /api/admin/logos-footer (que guarda la lista en
// JSON) — mismo motivo que /api/admin/colecciones/imagen: la imagen se sube
// acá, se recibe la URL pública, y recién ahí el panel la mete en el logo
// correspondiente antes de guardar la lista completa. Sin conversión a JPEG
// (a diferencia de prepararImagenParaSubir, que usa colecciones): un logo
// necesita conservar la transparencia del PNG/SVG original.
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
    if (archivo.size > 2 * 1024 * 1024) {
      return NextResponse.json({ ok: false, mensaje: "El logo no puede superar 2MB." }, { status: 400 });
    }

    const bytes = await archivo.arrayBuffer();
    const url = await subirImagenLogoFooter(archivo.name || "logo", bytes, archivo.type);
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    const detalle = err instanceof Error ? err.message : String(err);
    logError("api/admin/logos-footer/imagen POST", err, pistaBlob(detalle));
    return NextResponse.json({ ok: false, mensaje: "No se pudo subir el logo." }, { status: 500 });
  }
}
