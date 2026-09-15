import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { crearClienteServidor } from "@/lib/supabase";
import { requiereClienteActivo } from "@/lib/clienteAuth";
import { NotaEntregaDocumento, type DatosNotaEntrega } from "@/lib/pdf/notaEntregaPdf";
import { logError } from "@/lib/logger";
import type { DatosComprador, ItemCarrito } from "@/lib/carrito";

// @react-pdf/renderer usa APIs de Node (fontkit, buffers) — no corre en
// Edge, por eso el runtime explícito acá (el resto del proyecto no lo
// necesita porque Node ya es el default de las route handlers de Next).
export const runtime = "nodejs";

interface FilaPedidoConCliente {
  id: string;
  creado_en: string;
  estado: DatosNotaEntrega["estado"];
  items: ItemCarrito[];
  comprador: DatosComprador;
  total: number;
  notas_admin: string | null;
  cliente: { telefono_2: string | null; direccion: string | null; ciudad: string | null; estado_ubicacion: string | null } | null;
}

// Descarga la Nota de Entrega de UN pedido propio en PDF — RLS
// (propio_pedido_select) ya garantiza que .eq("id", id) no devuelva nada si
// el pedido no es de este cliente, así que un 404 acá cubre tanto "no
// existe" como "no es tuyo" sin distinguir entre los dos casos al cliente.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await crearClienteServidor();
  const permiso = await requiereClienteActivo(supabase);
  if (!permiso.ok) return permiso.respuesta;

  try {
    const { data, error } = await supabase
      .from("pedidos")
      .select("id, creado_en, estado, items, comprador, total, notas_admin, cliente:clientes(telefono_2, direccion, ciudad, estado_ubicacion)")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      logError("api/cliente/pedidos/[id]/pdf GET", error);
      return NextResponse.json({ ok: false, mensaje: "No se pudo generar el PDF." }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ ok: false, mensaje: "Pedido no encontrado." }, { status: 404 });
    }

    const pedido = data as unknown as FilaPedidoConCliente;
    const buffer = await renderToBuffer(
      <NotaEntregaDocumento
        pedido={{
          id: pedido.id,
          creadoEn: pedido.creado_en,
          estado: pedido.estado,
          items: pedido.items,
          comprador: pedido.comprador,
          total: pedido.total,
          notasAdmin: pedido.notas_admin,
          telefono2: pedido.cliente?.telefono_2 ?? null,
          direccion: pedido.cliente?.direccion ?? null,
          ciudad: pedido.cliente?.ciudad ?? null,
          estadoUbicacion: pedido.cliente?.estado_ubicacion ?? null,
        }}
      />,
    );

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="nota-entrega-${pedido.id.slice(0, 8)}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    logError("api/cliente/pedidos/[id]/pdf GET", err);
    return NextResponse.json({ ok: false, mensaje: "No se pudo generar el PDF." }, { status: 500 });
  }
}
