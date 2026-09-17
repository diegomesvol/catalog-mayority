import { NextRequest, NextResponse } from "next/server";
import { crearClienteServicio, crearClienteServidor } from "@/lib/supabase";
import { requiereClienteActivo } from "@/lib/clienteAuth";
import { crearPedidoSchema } from "@/lib/schemas/pedido";
import { leerCatalogoPublico } from "@/lib/blob";
import { recalcularPedido } from "@/lib/pedidoServidor";
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

    // La regla "perfil completo para pedir" solo vivía en el botón del
    // carrito; cualquier POST directo la salteaba.
    if (!permiso.perfil.perfilCompleto) {
      return NextResponse.json(
        { ok: false, mensaje: "Completá tu perfil para poder realizar pedidos.", codigo: "PERFIL_INCOMPLETO" },
        { status: 403 },
      );
    }

    // Precios/total NUNCA del body: se recalculan contra el catálogo vigente.
    const catalogo = await leerCatalogoPublico();
    if (!catalogo) {
      return NextResponse.json({ ok: false, mensaje: "No hay catálogo publicado." }, { status: 409 });
    }
    const recalculo = recalcularPedido(catalogo, parsed.data.items);
    if (!recalculo.ok) {
      return NextResponse.json({ ok: false, mensaje: recalculo.mensaje }, { status: 409 });
    }

    // Rol de servicio: la policy propio_pedido_insert se elimina (ver
    // migración 20260916000000_hardening_seguridad.sql) para que nadie
    // inserte pedidos directo por PostgREST. cliente_id sale de la sesión
    // ya validada arriba, nunca del body.
    const { data, error } = await crearClienteServicio()
      .from("pedidos")
      .insert({
        cliente_id: user.id,
        items: recalculo.items,
        // Identidad del comprador desde el perfil (definido por el admin al
        // invitar), no desde el formulario del carrito, que es editable.
        comprador: {
          nombre: permiso.perfil.nombre,
          empresa: permiso.perfil.empresa,
          telefono: permiso.perfil.telefono,
          rif: permiso.perfil.rif,
        },
        total: recalculo.total,
        // Captura del pedido (ver migración 20260916020000_...) — null si el
        // front no los mandó (ej. el guardado silencioso de "Enviar por
        // WhatsApp" sin completarlos, ver usePedidoWhatsApp.persistirPedido).
        metodo_pago: parsed.data.metodoPago ?? null,
        metodo_envio: parsed.data.metodoEnvio ?? null,
        direccion_envio: parsed.data.direccionEnvio ?? null,
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
