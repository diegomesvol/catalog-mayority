"use client";

import { useEffect, useId } from "react";
import { subtotalDelItem, unidadesDelItem } from "@/lib/carrito";
import { formatearFechaHora, formatearPrecio } from "@/lib/format";
import { METODOS_ENVIO_ETIQUETA, METODOS_PAGO_ETIQUETA } from "@/lib/schemas/pedido";
import { EstadoPedidoBadge } from "@/components/pedidos/EstadoPedidoBadge";
import { ImagenProducto } from "@/components/catalogo/ImagenProducto";
import { useBloqueoScroll } from "@/hooks/useBloqueoScroll";
import type { PedidoFila } from "./PedidosAdmin";

interface Props {
  pedido: PedidoFila;
  onCerrar: () => void;
}

// Vista desplegable del detalle de UN pedido — artículos con imagen,
// desglose de montos, datos de facturación (comprador) y dirección de
// despacho (la del pedido si la tiene, si no la del perfil del cliente como
// respaldo — ver la misma nota en lib/pdf/notaEntregaPdf.tsx). Modal en vez
// de drawer lateral (como InventarioEditarModal.tsx): el contenido es más
// alto que ancho, un modal centrado aprovecha mejor la pantalla.
export function PedidoDetalleModal({ pedido, onCerrar }: Props) {
  const idTitulo = useId();
  useBloqueoScroll(true);

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onCerrar();
    }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onCerrar]);

  const direccion = pedido.direccion_envio || [pedido.cliente?.direccion, pedido.cliente?.ciudad, pedido.cliente?.estado_ubicacion].filter(Boolean).join(", ");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-paper-raised shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink-200 p-4">
          <div>
            <h2 id={idTitulo} className="text-sm font-semibold text-ink-900">
              Pedido #{pedido.id.slice(0, 8).toUpperCase()}
            </h2>
            <p className="mt-0.5 text-xs text-ink-500">{formatearFechaHora(pedido.creado_en, { mes: "long" })}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <EstadoPedidoBadge estado={pedido.estado} />
            <button
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar"
              className="rounded-full p-1.5 text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Artículos</h3>
            <ul className="flex flex-col divide-y divide-ink-200 rounded-xl border border-ink-200">
              {pedido.items.map((item) => (
                <li key={item.itemId} className="flex items-center gap-3 p-3">
                  <ImagenProducto src={item.foto} alt={item.modelo} className="h-12 w-12 shrink-0 rounded-lg" sizes="48px" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-900">
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
                  <span className="shrink-0 text-sm font-medium text-ink-900">{formatearPrecio(subtotalDelItem(item))}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex items-center justify-end gap-3 px-1 text-sm">
              <span className="text-ink-500">Total</span>
              <span className="text-base font-semibold text-ink-900">{formatearPrecio(pedido.total)}</span>
            </div>
          </section>

          <section className="mt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Facturación</h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-ink-200 p-3 text-sm">
              <div className="min-w-0">
                <dt className="text-xs text-ink-500">Contacto</dt>
                <dd className="truncate text-ink-900">{pedido.comprador.nombre}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-ink-500">Empresa</dt>
                <dd className="truncate text-ink-900">{pedido.comprador.empresa}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-ink-500">RIF</dt>
                <dd className="truncate text-ink-900">{pedido.comprador.rif}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-ink-500">Teléfono</dt>
                <dd className="truncate text-ink-900">
                  {pedido.comprador.telefono}
                  {pedido.cliente?.telefono_2 ? ` / ${pedido.cliente.telefono_2}` : ""}
                </dd>
              </div>
            </dl>
          </section>

          <section className="mt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Pago y despacho</h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-ink-200 p-3 text-sm">
              <div>
                <dt className="text-xs text-ink-500">Método de pago</dt>
                <dd className="text-ink-900">{pedido.metodo_pago ? METODOS_PAGO_ETIQUETA[pedido.metodo_pago] : "No especificado"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-500">Método de envío</dt>
                <dd className="text-ink-900">{pedido.metodo_envio ? METODOS_ENVIO_ETIQUETA[pedido.metodo_envio] : "No especificado"}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-ink-500">Dirección de despacho</dt>
                <dd className="text-ink-900">{direccion || "No especificada"}</dd>
              </div>
            </dl>
          </section>

          {pedido.notas_admin && (
            <section className="mt-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Nota</h3>
              <p className="rounded-xl border border-ink-200 p-3 text-sm text-ink-700">{pedido.notas_admin}</p>
            </section>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-ink-200 p-4">
          <a
            href={`/api/admin/pedidos/${pedido.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-ink-200 px-4 py-2 text-sm font-medium text-ink-900 transition-colors hover:border-ink-900"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Ver / descargar PDF
          </a>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-full bg-ink-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ink-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
