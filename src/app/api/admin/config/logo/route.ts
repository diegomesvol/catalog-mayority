import { NextRequest, NextResponse } from "next/server";
import { subirImagenLogoMarca } from "@/lib/blob";
import { logError, pistaBlob } from "@/lib/logger";
import { crearClienteServidor } from "@/lib/supabase";
import { requierePermisoEscritura } from "@/lib/auth";
import { validarImagenSubida } from "@/lib/validacionImagen";

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
    if (!(archivo instanceof File)) {
      return NextResponse.json({ ok: false, mensaje: "Falta la imagen a subir." }, { status: 400 });
    }

    // validarImagenSubida chequea tipo + tamaño + firma real de bytes (o
    // sanea el SVG) — ver lib/validacionImagen.ts.
    const validacion = await validarImagenSubida(archivo, TIPOS_IMAGEN_PERMITIDOS, "El logo");
    if (!validacion.ok) {
      return NextResponse.json({ ok: false, mensaje: validacion.mensaje }, { status: 400 });
    }

    const url = await subirImagenLogoMarca(archivo.name || "logo", validacion.bytes!, validacion.contentType!);
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    const detalle = err instanceof Error ? err.message : String(err);
    logError("api/admin/config/logo POST", err, pistaBlob(detalle));
    return NextResponse.json({ ok: false, mensaje: "No se pudo subir el logo." }, { status: 500 });
  }
}
