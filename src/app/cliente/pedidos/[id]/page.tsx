import Link from "next/link";
import { notFound } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase";
import { obtenerClienteActivo } from "@/lib/clienteAuth";
import { formatearPrecio } from "@/lib/format";
import { subtotalDelItem, unidadesDelItem, type DatosComprador, type ItemCarrito } from "@/lib/carrito";
import { logError } from "@/lib/logger";
import { EstadoPedidoBadge } from "@/components/pedidos/EstadoPedidoBadge";
import { METODOS_ENVIO_ETIQUETA, METODOS_PAGO_ETIQUETA, type EstadoPedido, type MetodoEnvio, type MetodoPago } from "@/lib/schemas/pedido";

export const metadata = { title: "Detalle del pedido" };
export const dynamic = "force-dynamic";

interface Pedido {
  id: string;
  items: ItemCarrito[];
  comprador: DatosComprador;
  total: number;
  estado: EstadoPedido;
  notas_admin: string | null;
  creado_en: string;
  metodo_pago: MetodoPago | null;
  metodo_envio: MetodoEnvio | null;
  direccion_envio: string | null;
}

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-VE", { day: "2-digit", month: "long", year: "numeric" });
}

// Vista detallada de UN pedido propio — RLS (propio_pedido_select) ya
// garantiza que .eq("id", id) no devuelva nada si el pedido no es de este
// cliente, así que un notFound() acá cubre "no existe" y "no es tuyo" sin
// distinguir entre los dos casos.
export default async function PaginaDetallePedidoCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await crearClienteServidor();
  const perfil = await obtenerClienteActivo(supabase);

  const { data: pedido, error } = await supabase
    .from("pedidos")
    .select("id, items, comprador, total, estado, notas_admin, creado_en, metodo_pago, metodo_envio, direccion_envio")
    .eq("id", id)
    .maybeSingle();

  if (error) logError("cliente/pedidos/[id].PaginaDetallePedidoCliente", error);
  if (!pedido) notFound();

  const p = pedido as Pedido;

  return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Link href="/cliente" className="text-sm font-medium text-ink-500 hover:text-ink-900">
          ← Mis pedidos
        </Link>

        <div className="mt-3 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-base font-semibold text-ink-900">Pedido {p.id.slice(0, 8).toUpperCase()}</h1>
            <p className="text-sm text-ink-500">{formatearFecha(p.creado_en)}</p>
          </div>
          <EstadoPedidoBadge estado={p.estado} />
        </div>

        <a
          href={`/api/cliente/pedidos/${p.id}/pdf`}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-100"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Descargar nota de entrega (PDF)
        </a>

        <div className="mt-6 rounded-2xl border border-ink-200 bg-paper-raised p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-ink-900">Productos</h2>
          <ul className="mt-3 flex flex-col divide-y divide-ink-200">
            {p.items.map((item) => (
              <li key={item.itemId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div>
                  <p className="font-medium text-ink-900">
                    {item.marca} — {item.modelo} — {item.color}
                    {item.esCalzado && item.curvaRango !== "Único" ? ` · Tallas ${item.curvaRango}` : ""}
                  </p>
                  <p className="text-xs text-ink-500">
                    {item.esCalzado
                      ? `${item.cantidad} bulto${item.cantidad === 1 ? "" : "s"} · ${unidadesDelItem(item)} pares`
                      : `${item.cantidad} unidad${item.cantidad === 1 ? "" : "es"}`}
                    {" — "}
                    {formatearPrecio(item.precio)} c/u
                  </p>
                </div>
                <span className="shrink-0 font-medium text-ink-900">{formatearPrecio(subtotalDelItem(item))}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-ink-200 pt-3">
            <span className="text-sm text-ink-500">Total</span>
            <span className="text-lg font-semibold text-ink-900">{formatearPrecio(p.total)}</span>
          </div>
        </div>

        {p.notas_admin && (
          <div className="mt-4 rounded-2xl border border-ink-200 bg-paper-raised p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-ink-900">Nota del vendedor</h2>
            <p className="mt-2 text-sm text-ink-700">{p.notas_admin}</p>
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-ink-200 bg-paper-raised p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-ink-900">Comprador</h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-xs text-ink-500">Nombre</dt>
              <dd className="text-ink-900">{p.comprador.nombre}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-500">Empresa</dt>
              <dd className="text-ink-900">{p.comprador.empresa}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-500">Teléfono</dt>
              <dd className="text-ink-900">{p.comprador.telefono}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-500">RIF</dt>
              <dd className="text-ink-900">{p.comprador.rif}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-4 rounded-2xl border border-ink-200 bg-paper-raised p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-ink-900">Pago y envío</h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-xs text-ink-500">Método de pago</dt>
              <dd className="text-ink-900">{p.metodo_pago ? METODOS_PAGO_ETIQUETA[p.metodo_pago] : "No especificado"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-500">Método de envío</dt>
              <dd className="text-ink-900">{p.metodo_envio ? METODOS_ENVIO_ETIQUETA[p.metodo_envio] : "No especificado"}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-ink-500">Dirección de despacho</dt>
              <dd className="text-ink-900">{p.direccion_envio || "No especificada"}</dd>
            </div>
          </dl>
        </div>
      </main>
  );
}
