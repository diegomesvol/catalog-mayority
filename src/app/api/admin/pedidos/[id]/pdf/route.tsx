import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { crearClienteServidor } from "@/lib/supabase";
import { obtenerAdminActivo } from "@/lib/auth";
import { NotaEntregaDocumento, type DatosNotaEntrega } from "@/lib/pdf/notaEntregaPdf";
import { logError } from "@/lib/logger";
import type { DatosComprador, ItemCarrito } from "@/lib/carrito";
import type { MetodoEnvio, MetodoPago } from "@/lib/schemas/pedido";

// Mismo documento que api/cliente/pedidos/[id]/pdf (ver esa ruta y la nota
// grande en lib/pdf/notaEntregaPdf.tsx) — acá sin filtrar por cliente_id
// (cualquier admin activo puede ver/descargar la nota de entrega de
// CUALQUIER pedido, igual que GET /api/admin/pedidos).
export const runtime = "nodejs";

interface FilaPedidoConCliente {
  id: string;
  creado_en: string;
  estado: DatosNotaEntrega["estado"];
  items: ItemCarrito[];
  comprador: DatosComprador;
  total: number;
  notas_admin: string | null;
  metodo_pago: MetodoPago | null;
  metodo_envio: MetodoEnvio | null;
  direccion_envio: string | null;
  cliente: { telefono_2: string | null; direccion: string | null; ciudad: string | null; estado_ubicacion: string | null } | null;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await crearClienteServidor();
  const admin = await obtenerAdminActivo(supabase);
  if (!admin) return NextResponse.json({ ok: false, mensaje: "No autenticado." }, { status: 401 });

  try {
    const { data, error } = await supabase
      .from("pedidos")
      .select(
        "id, creado_en, estado, items, comprador, total, notas_admin, metodo_pago, metodo_envio, direccion_envio, cliente:clientes(telefono_2, direccion, ciudad, estado_ubicacion)",
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      logError("api/admin/pedidos/[id]/pdf GET", error);
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
          metodoPago: pedido.metodo_pago,
          metodoEnvio: pedido.metodo_envio,
          direccionEnvio: pedido.direccion_envio,
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
        "Content-Disposition": `inline; filename="nota-entrega-${pedido.id.slice(0, 8)}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    logError("api/admin/pedidos/[id]/pdf GET", err);
    return NextResponse.json({ ok: false, mensaje: "No se pudo generar el PDF." }, { status: 500 });
  }
}
