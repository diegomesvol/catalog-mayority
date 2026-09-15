import { NextRequest, NextResponse } from "next/server";
import { subirImagenColeccion } from "@/lib/blob";
import { logError, pistaBlob } from "@/lib/logger";
import { crearClienteServidor } from "@/lib/supabase";
import { requierePermisoEscritura } from "@/lib/auth";

// Endpoint aparte del de /api/admin/colecciones (que guarda la lista en
// JSON): la portada se sube acá, se recibe la URL pública resultante, y
// recién ahí el panel la mete en el objeto de la colección antes de guardar
// la lista completa — así el upload no se pierde si el resto del form tiene
// algún error de validación.
const TIPOS_IMAGEN_PERMITIDOS = ["image/png", "image/jpeg", "image/webp"];

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
      return NextResponse.json({ ok: false, mensaje: "La imagen debe ser PNG, JPG o WEBP." }, { status: 400 });
    }

    const bytes = await archivo.arrayBuffer();
    const url = await subirImagenColeccion(archivo.name || "portada", bytes, archivo.type);
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    const detalle = err instanceof Error ? err.message : String(err);
    logError("api/admin/colecciones/imagen POST", err, pistaBlob(detalle));
    return NextResponse.json({ ok: false, mensaje: "No se pudo subir la imagen." }, { status: 500 });
  }
}
