import Link from "next/link";
import { ClienteHeader } from "@/components/cliente/ClienteHeader";
import { crearClienteServidor } from "@/lib/supabase";
import { obtenerClienteActivo } from "@/lib/clienteAuth";
import { formatearPrecio } from "@/lib/format";
import type { ItemCarrito } from "@/lib/carrito";
import { logError } from "@/lib/logger";

export const metadata = { title: "Mis pedidos" };
export const dynamic = "force-dynamic";

interface Pedido {
  id: string;
  items: ItemCarrito[];
  total: number;
  estado: "pendiente" | "confirmado" | "despachado" | "cancelado";
  notas_admin: string | null;
  creado_en: string;
}

const ESTADO_ETIQUETA: Record<Pedido["estado"], string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  despachado: "Despachado",
  cancelado: "Cancelado",
};

const ESTADO_CLASE: Record<Pedido["estado"], string> = {
  pendiente: "border-warning-600/30 bg-warning-100 text-warning-600",
  confirmado: "border-accent-600/30 bg-accent-100 text-accent-600",
  despachado: "border-success-600/30 bg-success-100 text-success-600",
  cancelado: "border-danger-600/30 bg-danger-100 text-danger-600",
};

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric" });
}

// El proxy (src/proxy.ts) ya garantiza que solo llega acá un cliente activo
// logueado — igual se vuelve a resolver el perfil (en vez de asumirlo) por
// las mismas razones que el dashboard admin: es la forma normal de leer
// datos propios en un server component, no una segunda barrera de seguridad.
export default async function PaginaCliente() {
  const supabase = await crearClienteServidor();
  const perfil = await obtenerClienteActivo(supabase);

  let pedidos: Pedido[] = [];
  if (perfil) {
    const { data, error } = await supabase
      .from("pedidos")
      .select("id, items, total, estado, notas_admin, creado_en")
      .order("creado_en", { ascending: false });
    if (error) {
      logError("cliente/page.PaginaCliente", error);
    } else {
      pedidos = (data ?? []) as Pedido[];
    }
  }

  return (
    <ClienteHeader perfilCompleto={perfil?.perfilCompleto ?? true}>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {perfil && (
          <div className="mb-6">
            <p className="text-sm font-medium text-ink-900">{perfil.nombre}</p>
            <p className="text-xs text-ink-500">{perfil.empresa}</p>
          </div>
        )}

        <h1 className="mb-4 text-base font-semibold text-ink-900">Historial de pedidos</h1>

        {pedidos.length === 0 ? (
          <p className="text-sm text-ink-500">
            Todavía no tenés pedidos registrados. Los pedidos que hagas desde el catálogo van a aparecer acá.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pedidos.map((pedido) => (
              <li key={pedido.id}>
                <Link
                  href={`/cliente/pedidos/${pedido.id}`}
                  className="block rounded-2xl border border-ink-200 bg-paper-raised p-4 transition-colors hover:border-ink-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-ink-900">{formatearFecha(pedido.creado_en)}</p>
                      <p className="text-xs text-ink-500">
                        {pedido.items.length} producto{pedido.items.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${ESTADO_CLASE[pedido.estado]}`}
                    >
                      {ESTADO_ETIQUETA[pedido.estado]}
                    </span>
                  </div>

                  <ul className="mt-3 flex flex-col gap-1 border-t border-ink-200 pt-3">
                    {pedido.items.map((item) => (
                      <li key={item.itemId} className="flex items-center justify-between gap-2 text-xs text-ink-700">
                        <span>
                          {item.marca} — {item.modelo} — {item.color}
                          {item.esCalzado && item.curvaRango !== "Único" ? ` · Tallas ${item.curvaRango}` : ""}
                        </span>
                        <span className="shrink-0 text-ink-500">
                          {item.cantidad} {item.esCalzado ? "bulto" + (item.cantidad === 1 ? "" : "s") : "unidad" + (item.cantidad === 1 ? "" : "es")}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {pedido.notas_admin && (
                    <p className="mt-3 rounded-lg bg-paper px-3 py-2 text-xs text-ink-700">
                      <span className="font-medium text-ink-900">Nota: </span>
                      {pedido.notas_admin}
                    </p>
                  )}

                  <div className="mt-3 flex items-center justify-between border-t border-ink-200 pt-3">
                    <span className="text-xs text-ink-500">Total</span>
                    <span className="text-sm font-semibold text-ink-900">{formatearPrecio(pedido.total)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </ClienteHeader>
  );
}
