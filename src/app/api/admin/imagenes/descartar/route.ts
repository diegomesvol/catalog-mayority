import { NextRequest, NextResponse } from "next/server";
import { eliminarImagenPublica } from "@/lib/blob";
import { logError } from "@/lib/logger";
import { crearClienteServidor } from "@/lib/supabase";
import { requierePermisoEscritura } from "@/lib/auth";

// Endpoint genérico para descartar una imagen que se subió al bucket público
// (logo de marca, fondo de login, portada de colección, logo de footer —
// todas comparten el mismo patrón "se sube enseguida, se persiste recién al
// guardar") cuando el admin cierra la edición SIN llegar a guardar. Los
// endpoints de guardado (config, colecciones, logos-footer, guia-tallas) ya
// limpian el archivo VIEJO cuando una imagen persistida se reemplaza o se
// quita — este es el otro caso, el de un archivo nuevo que nunca llegó a
// persistirse en ningún lado. eliminarImagenPublica es best-effort (ver la
// nota en lib/blob.ts): esta ruta siempre responde ok, un fallo de limpieza
// de Storage no es algo que el panel necesite mostrarle al admin.
export async function POST(request: NextRequest) {
  try {
    const supabase = await crearClienteServidor();
    const permiso = await requierePermisoEscritura(supabase, "operativo");
    if (!permiso.ok) return permiso.respuesta;

    const body = await request.json().catch(() => null);
    const url = typeof body?.url === "string" ? body.url : null;
    if (url) await eliminarImagenPublica(url);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("api/admin/imagenes/descartar POST", err);
    // Best-effort — nunca es un error que el panel deba mostrar.
    return NextResponse.json({ ok: true });
  }
}
