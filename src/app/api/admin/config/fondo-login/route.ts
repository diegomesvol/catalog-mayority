import { NextRequest, NextResponse } from "next/server";
import { subirImagenFondoLogin } from "@/lib/blob";
import { logError, pistaBlob } from "@/lib/logger";
import { crearClienteServidor } from "@/lib/supabase";
import { requierePermisoEscritura } from "@/lib/auth";

// Mismo patrón que /api/admin/colecciones/imagen: endpoint aparte del de
// /api/admin/config (que guarda el JSON completo) — la imagen se sube acá,
// se recibe la URL pública resultante ("/api/imagenes/login/…") y recién
// ahí ConfiguracionForm la mete en el campo fondoLoginUrl del formulario,
// sin persistirla todavía (eso pasa recién al "Guardar cambios", igual que
// los otros 3 campos de este formulario — ver la nota en ConfiguracionForm).
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
    const url = await subirImagenFondoLogin(archivo.name || "fondo", bytes, archivo.type);
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    const detalle = err instanceof Error ? err.message : String(err);
    logError("api/admin/config/fondo-login POST", err, pistaBlob(detalle));
    return NextResponse.json({ ok: false, mensaje: "No se pudo subir la imagen." }, { status: 500 });
  }
}
