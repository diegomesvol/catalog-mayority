import { NextRequest, NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase";
import { requiereClienteActivo } from "@/lib/clienteAuth";
import { crearPedidoSchema } from "@/lib/schemas/pedido";
import { logError } from "@/lib/logger";

// Historial de pedidos del cliente logueado. RLS (propio_pedido_select) ya
// limita esto a sus propios pedidos aunque acá se use el cliente normal
// (no el de servicio) — este chequeo de sesión es la primera barrera, RLS
// la segunda.
export async function GET() {
  const supabase = await crearClienteServidor();
  const permiso = await requiereClienteActivo(supabase);
  if (!permiso.ok) return permiso.respuesta;

  const { data, error } = await supabase.from("pedidos").select("*").order("creado_en", { ascending: false });
  if (error) {
    logError("api/cliente/pedidos GET", error);
    return NextResponse.json({ ok: false, mensaje: "No se pudieron leer tus pedidos." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, pedidos: data });
}

// Guarda el pedido que el carrito ya armó y mandó por WhatsApp (ver
// usePedidoWhatsApp) — se SUMA a ese flujo, no lo reemplaza: si esto falla,
// el envío por WhatsApp igual se hace (ver el try/catch del lado del
// cliente). Es lo que le permite al cliente ver después "lo que pidió" en
// /cliente, y al admin hacerle seguimiento por estado.
export async function POST(request: NextRequest) {
  const supabase = await crearClienteServidor();
  const permiso = await requiereClienteActivo(supabase);
  if (!permiso.ok) return permiso.respuesta;

  try {
    const body = await request.json().catch(() => null);
    const parsed = crearPedidoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, mensaje: parsed.error.issues[0].message }, { status: 400 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, mensaje: "No autenticado." }, { status: 401 });

    const { data, error } = await supabase
      .from("pedidos")
      .insert({
        cliente_id: user.id,
        items: parsed.data.items,
        comprador: parsed.data.comprador,
        total: parsed.data.total,
      })
      .select()
      .single();

    if (error) {
      logError("api/cliente/pedidos POST", error);
      return NextResponse.json({ ok: false, mensaje: "No se pudo guardar el pedido." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, pedido: data });
  } catch (err) {
    logError("api/cliente/pedidos POST", err);
    return NextResponse.json({ ok: false, mensaje: "No se pudo guardar el pedido." }, { status: 500 });
  }
}
