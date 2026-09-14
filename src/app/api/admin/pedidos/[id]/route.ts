import { NextRequest, NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase";
import { requierePermisoEscritura } from "@/lib/auth";
import { actualizarPedidoSchema } from "@/lib/schemas/pedido";
import { logError } from "@/lib/logger";

// Cambia el estado de un pedido (seguimiento operativo) — "operativo" en
// requierePermisoEscritura, no "catalogo": el editor sí puede, el demo no.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await crearClienteServidor();
  const permiso = await requierePermisoEscritura(supabase, "operativo");
  if (!permiso.ok) return permiso.respuesta;

  try {
    const body = await request.json().catch(() => null);
    const parsed = actualizarPedidoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, mensaje: parsed.error.issues[0].message }, { status: 400 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("pedidos")
      .update({
        estado: parsed.data.estado,
        notas_admin: parsed.data.notasAdmin ?? null,
        actualizado_en: new Date().toISOString(),
        actualizado_por: user?.id ?? null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      logError("api/admin/pedidos/[id] PATCH", error);
      return NextResponse.json({ ok: false, mensaje: "No se pudo actualizar el pedido." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, pedido: data });
  } catch (err) {
    logError("api/admin/pedidos/[id] PATCH", err);
    return NextResponse.json({ ok: false, mensaje: "No se pudo actualizar el pedido." }, { status: 500 });
  }
}
