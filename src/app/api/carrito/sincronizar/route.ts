import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { leerCatalogoPublico } from "@/lib/blob";
import { resolverItems } from "@/lib/pedidoServidor";
import { logError } from "@/lib/logger";

// El carrito vive en localStorage y sobrevive a una nueva publicación del
// catálogo: sin esto, el comprador veía (y mandaba por WhatsApp) precios y
// stock viejos, o líneas que ya no existen. Público a propósito: solo
// devuelve datos que ya son públicos en el catálogo.
const schema = z.object({
  items: z
    .array(
      z.object({
        productoId: z.string().min(1).max(200),
        color: z.string().max(200),
        curvaId: z.string().max(200),
        cantidad: z.number().int().positive().max(100_000),
      }),
    )
    .max(200),
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, mensaje: "Carrito inválido." }, { status: 400 });
  }

  try {
    const catalogo = await leerCatalogoPublico();
    if (!catalogo) {
      return NextResponse.json({ ok: false, mensaje: "No hay catálogo publicado." }, { status: 404 });
    }
    const { items, faltantes } = resolverItems(catalogo, parsed.data.items);
    return NextResponse.json(
      { ok: true, items, faltantes: faltantes.map((f) => ({ productoId: f.productoId, color: f.color, curvaId: f.curvaId })) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    logError("api/carrito/sincronizar POST", err);
    return NextResponse.json({ ok: false, mensaje: "No se pudo sincronizar el carrito." }, { status: 500 });
  }
}
