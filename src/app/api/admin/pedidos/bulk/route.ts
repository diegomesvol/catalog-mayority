import { NextRequest, NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase";
import { requierePermisoEscritura } from "@/lib/auth";
import { actualizarPedidoBulkSchema } from "@/lib/schemas/pedido";
import { logError } from "@/lib/logger";

// Cambia el estado de varios pedidos a la vez (acción masiva de la tabla de
// pedidos) — mismas reglas que PATCH /api/admin/pedidos/[id] (operativo: el
// editor sí puede, el demo no), aplicadas en un solo UPDATE con
// .in("id", ids) en vez de un PATCH por pedido. Sin notasAdmin: una nota en
// lote no tiene sentido (son pedidos distintos) — eso se sigue editando
// pedido por pedido desde el detalle.
export async function POST(request: NextRequest) {
  const supabase = await crearClienteServidor();
  const permiso = await requierePermisoEscritura(supabase, "operativo");
  if (!permiso.ok) return permiso.respuesta;

  try {
    const body = await request.json().catch(() => null);
    const parsed = actualizarPedidoBulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, mensaje: parsed.error.issues[0].message }, { status: 400 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("pedidos")
      .update({ estado: parsed.data.estado, actualizado_en: new Date().toISOString(), actualizado_por: user?.id ?? null })
      .in("id", parsed.data.ids)
      .select("id");

    if (error) {
      logError("api/admin/pedidos/bulk POST", error);
      return NextResponse.json({ ok: false, mensaje: "No se pudo actualizar el estado de los pedidos seleccionados." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, actualizados: data?.length ?? 0 });
  } catch (err) {
    logError("api/admin/pedidos/bulk POST", err);
    return NextResponse.json({ ok: false, mensaje: "No se pudo actualizar el estado de los pedidos seleccionados." }, { status: 500 });
  }
}
