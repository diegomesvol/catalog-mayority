import { NextRequest, NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase";
import { requiereClienteActivo } from "@/lib/clienteAuth";
import { logError } from "@/lib/logger";

// Sube el logo/foto del negocio al bucket público de Storage, carpeta
// "clientes-logos/<user_id>/…" — RLS (storage.objects, policies
// cliente_sube_su_logo/cliente_actualiza_su_logo) ya obliga ese prefijo
// exacto con el propio auth.uid(), así que un cliente solo puede escribir
// dentro de su propia carpeta aunque intente mandar otro path. Se usa el
// cliente normal (crearClienteServidor, respeta RLS) — no el de servicio —
// mismo criterio que el resto de las subidas del panel admin (ver lib/blob.ts).
const TIPOS_IMAGEN_PERMITIDOS = ["image/png", "image/jpeg", "image/webp"];
const BUCKET_PUBLICO = "publico";

export async function POST(request: NextRequest) {
  const supabase = await crearClienteServidor();
  const permiso = await requiereClienteActivo(supabase);
  if (!permiso.ok) return permiso.respuesta;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, mensaje: "No autenticado." }, { status: 401 });

    const formData = await request.formData();
    const archivo = formData.get("archivo");
    if (!(archivo instanceof File) || archivo.size === 0) {
      return NextResponse.json({ ok: false, mensaje: "Falta la imagen a subir." }, { status: 400 });
    }
    if (!TIPOS_IMAGEN_PERMITIDOS.includes(archivo.type)) {
      return NextResponse.json({ ok: false, mensaje: "La imagen debe ser PNG, JPG o WEBP." }, { status: 400 });
    }

    // Nombre fijo (no addRandomSuffix): un solo logo por cliente, cada
    // subida nueva reemplaza la anterior en el mismo path (upsert) en vez
    // de acumular archivos huérfanos en Storage.
    const extension = archivo.type === "image/png" ? "png" : archivo.type === "image/webp" ? "webp" : "jpg";
    const path = `clientes-logos/${user.id}/logo.${extension}`;
    const bytes = await archivo.arrayBuffer();

    const { error: errorSubida } = await supabase.storage.from(BUCKET_PUBLICO).upload(path, bytes, {
      contentType: archivo.type,
      upsert: true,
    });
    if (errorSubida) throw errorSubida;

    const { data } = supabase.storage.from(BUCKET_PUBLICO).getPublicUrl(path);
    // Cache-bust: mismo path siempre, así que sin esto el navegador (o un
    // CDN intermedio) podría seguir mostrando el logo viejo tras un
    // reemplazo — el query param no cambia el archivo que se sirve.
    const url = `${data.publicUrl}?v=${Date.now()}`;

    const { error: errorUpdate } = await supabase.from("clientes").update({ logo_url: url }).eq("user_id", user.id);
    if (errorUpdate) throw errorUpdate;

    return NextResponse.json({ ok: true, url });
  } catch (err) {
    logError("api/cliente/perfil/logo POST", err);
    return NextResponse.json({ ok: false, mensaje: "No se pudo subir el logo." }, { status: 500 });
  }
}
