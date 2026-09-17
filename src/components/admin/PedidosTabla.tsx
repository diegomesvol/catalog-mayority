"use client";

import { formatearPrecio } from "@/lib/format";
import { ESTADOS_PEDIDO, ESTADO_PEDIDO_ETIQUETA, METODOS_ENVIO_ETIQUETA, METODOS_PAGO_ETIQUETA, type EstadoPedido } from "@/lib/schemas/pedido";
import { EstadoPedidoBadge } from "@/components/pedidos/EstadoPedidoBadge";
import type { PedidoFila } from "./PedidosAdmin";

interface Props {
  filas: PedidoFila[];
  seleccionados: Set<string>;
  todosSeleccionados: boolean;
  cambiandoEstadoId: string | null;
  onToggleFila: (id: string) => void;
  onToggleTodos: () => void;
  onVerDetalle: (pedido: PedidoFila) => void;
  onCambiarEstadoRapido: (id: string, estado: EstadoPedido) => void;
}

function formatearFechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-VE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Tabla del módulo de Gestión de Pedidos — bordes limpios, hover, checkboxes
// y badges de estado (mismo criterio de "HeroUI con Tailwind + los tokens
// del proyecto, sin instalar la librería" que InventarioTabla.tsx, ver la
// nota grande en InventarioAdmin.tsx sobre por qué). "overflow-x-auto" en el
// contenedor: en mobile scrollea horizontal en vez de aplastar el contenido.
export function PedidosTabla({ filas, seleccionados, todosSeleccionados, cambiandoEstadoId, onToggleFila, onToggleTodos, onVerDetalle, onCambiarEstadoRapido }: Props) {
  return (
    <div className="min-w-0 overflow-x-auto rounded-xl border border-ink-200">
      <table className="w-full min-w-[1100px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink-200 bg-ink-100 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
            <th className="w-10 px-3 py-2.5">
              <input
                type="checkbox"
                checked={todosSeleccionados}
                onChange={onToggleTodos}
                aria-label="Seleccionar todos los pedidos"
                className="h-4 w-4 rounded border-ink-300 text-accent-600 focus:ring-accent-600"
              />
            </th>
            <th className="px-3 py-2.5">N.° de orden</th>
            <th className="px-3 py-2.5">Cliente</th>
            <th className="px-3 py-2.5">Fecha / hora</th>
            <th className="px-3 py-2.5">Pago / envío</th>
            <th className="px-3 py-2.5">Total</th>
            <th className="px-3 py-2.5">Estado</th>
            <th className="px-3 py-2.5">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-200">
          {filas.map((p) => {
            const activa = seleccionados.has(p.id);
            return (
              <tr key={p.id} className={`transition-colors ${activa ? "bg-accent-100/60" : "hover:bg-ink-100/60"}`}>
                <td className="px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={activa}
                    onChange={() => onToggleFila(p.id)}
                    aria-label={`Seleccionar pedido ${p.id.slice(0, 8).toUpperCase()}`}
                    className="h-4 w-4 rounded border-ink-300 text-accent-600 focus:ring-accent-600"
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 font-medium text-ink-900">
                  <button type="button" onClick={() => onVerDetalle(p)} className="hover:underline">
                    #{p.id.slice(0, 8).toUpperCase()}
                  </button>
                  <p className="text-xs font-normal text-ink-500">{p.items.length} producto{p.items.length === 1 ? "" : "s"}</p>
                </td>
                <td className="px-3 py-2.5">
                  <p className="font-medium text-ink-900">{p.comprador.empresa || p.comprador.nombre}</p>
                  <p className="text-xs text-ink-500">{p.comprador.nombre}</p>
                  {p.cliente?.email && <p className="text-xs text-ink-500">{p.cliente.email}</p>}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-ink-500">{formatearFechaHora(p.creado_en)}</td>
                <td className="px-3 py-2.5 text-ink-500">
                  <p>{p.metodo_pago ? METODOS_PAGO_ETIQUETA[p.metodo_pago] : "—"}</p>
                  <p className="text-xs">{p.metodo_envio ? METODOS_ENVIO_ETIQUETA[p.metodo_envio] : "—"}</p>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 font-medium text-ink-900">{formatearPrecio(p.total)}</td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-col gap-1">
                    <EstadoPedidoBadge estado={p.estado} />
                    <select
                      value={p.estado}
                      disabled={cambiandoEstadoId === p.id}
                      onChange={(e) => onCambiarEstadoRapido(p.id, e.target.value as EstadoPedido)}
                      aria-label={`Cambiar estado del pedido ${p.id.slice(0, 8).toUpperCase()}`}
                      className="rounded-lg border border-ink-200 bg-paper-raised px-1.5 py-1 text-[11px] text-ink-700 focus:border-accent-600 disabled:opacity-50"
                    >
                      {ESTADOS_PEDIDO.map((e) => (
                        <option key={e} value={e}>
                          {ESTADO_PEDIDO_ETIQUETA[e]}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onVerDetalle(p)}
                      className="rounded-full border border-ink-200 px-3 py-1 text-xs font-medium text-ink-900 transition-colors hover:border-ink-900"
                    >
                      Detalle
                    </button>
                    <a
                      href={`/api/admin/pedidos/${p.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Ver PDF del pedido ${p.id.slice(0, 8).toUpperCase()}`}
                      title="Ver / descargar nota de entrega (PDF)"
                      className="rounded-full border border-ink-200 p-1.5 text-ink-700 transition-colors hover:border-ink-900 hover:text-ink-900"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
