import { NextRequest, NextResponse } from "next/server";
import { subirImagenLogoFooter } from "@/lib/blob";
import { logError, pistaBlob } from "@/lib/logger";
import { crearClienteServidor } from "@/lib/supabase";
import { requierePermisoEscritura } from "@/lib/auth";
import { validarImagenSubida } from "@/lib/validacionImagen";

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
    if (!(archivo instanceof File)) {
      return NextResponse.json({ ok: false, mensaje: "Falta la imagen a subir." }, { status: 400 });
    }

    const validacion = await validarImagenSubida(archivo, TIPOS_IMAGEN_PERMITIDOS, "El logo");
    if (!validacion.ok) {
      return NextResponse.json({ ok: false, mensaje: validacion.mensaje }, { status: 400 });
    }

    const url = await subirImagenLogoFooter(archivo.name || "logo", validacion.bytes!, validacion.contentType!);
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    const detalle = err instanceof Error ? err.message : String(err);
    logError("api/admin/logos-footer/imagen POST", err, pistaBlob(detalle));
    return NextResponse.json({ ok: false, mensaje: "No se pudo subir el logo." }, { status: 500 });
  }
}
