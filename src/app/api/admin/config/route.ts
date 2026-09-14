import { NextRequest, NextResponse } from "next/server";
import { guardarConfigSitio, leerConfigSitio } from "@/lib/blob";
import type { ConfigSitio } from "@/lib/types";
import { logError, pistaBlob } from "@/lib/logger";
import { configSitioSchema } from "@/lib/schemas/configSitio";
import { crearClienteServidor } from "@/lib/supabase";
import { requierePermisoEscritura } from "@/lib/auth";

// Config operativa del sitio (WhatsApp de ventas, datos de contacto del
// footer) — Propuesta 10. Mismo patrón que /api/admin/guia-tallas: GET
// devuelve lo guardado (o los 3 campos en null si no se configuró nada
// todavía), POST reemplaza el documento entero con lo que llega del form.
export async function GET() {
  try {
    const config = await leerConfigSitio();
    return NextResponse.json({ ok: true, config });
  } catch (err) {
    const detalle = err instanceof Error ? err.message : String(err);
    logError("api/admin/config GET", err, pistaBlob(detalle));
    return NextResponse.json({ ok: false, mensaje: "No se pudo leer la configuración." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await crearClienteServidor();
    const permiso = await requierePermisoEscritura(supabase, "operativo");
    if (!permiso.ok) return permiso.respuesta;

    const body = await request.json().catch(() => null);

    // Misma validación que el formulario del panel (ConfiguracionForm) —
    // acá es la última línea de defensa: el form ya no debería dejar pasar
    // nada de esto, pero la API no confía únicamente en el cliente.
    const parsed = configSitioSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, mensaje: parsed.error.issues[0].message }, { status: 400 });
    }

    const config: ConfigSitio = {
      whatsappVentas: parsed.data.whatsappVentas || null,
      descripcionEmpresa: parsed.data.descripcionEmpresa || null,
      rif: parsed.data.rif || null,
      fondoLoginUrl: parsed.data.fondoLoginUrl || null,
    };

    await guardarConfigSitio(config);
    return NextResponse.json({ ok: true, config });
  } catch (err) {
    const detalle = err instanceof Error ? err.message : String(err);
    logError("api/admin/config POST", err, pistaBlob(detalle));
    return NextResponse.json({ ok: false, mensaje: "No se pudo guardar la configuración." }, { status: 500 });
  }
}
