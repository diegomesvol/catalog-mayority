import { NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase";
import { obtenerAdminActivo } from "@/lib/auth";
import { logError } from "@/lib/logger";

// Lista de todos los pedidos (de todos los clientes) para el panel admin —
// solo lectura, cualquier admin activo (incl. demo) puede verla. Se trae el
// nombre/empresa del cliente vía el embed automático de PostgREST por la FK
// pedidos.cliente_id -> clientes.user_id.
export async function GET() {
  try {
    const supabase = await crearClienteServidor();
    const admin = await obtenerAdminActivo(supabase);
    if (!admin) return NextResponse.json({ ok: false, mensaje: "No autenticado." }, { status: 401 });

    // Columnas explícitas (no select("*")): la tabla también tiene
    // cliente_id, actualizado_en y actualizado_por, que esta pantalla no
    // usa — traerlas de más es trabajo innecesario para Postgres/PostgREST
    // en una lista que puede crecer bastante.
    const { data, error } = await supabase
      .from("pedidos")
      .select(
        "id, items, comprador, total, estado, notas_admin, creado_en, metodo_pago, metodo_envio, direccion_envio, cliente:clientes(nombre, empresa, telefono, email, rif, direccion, ciudad, estado_ubicacion, telefono_2)",
      )
      .order("creado_en", { ascending: false });

    if (error) {
      logError("api/admin/pedidos GET", error);
      return NextResponse.json({ ok: false, mensaje: "No se pudieron leer los pedidos." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, pedidos: data });
  } catch (err) {
    logError("api/admin/pedidos GET", err);
    return NextResponse.json({ ok: false, mensaje: "No se pudieron leer los pedidos." }, { status: 500 });
  }
}
