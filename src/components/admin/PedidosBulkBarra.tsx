"use client";

import { useState } from "react";
import { ESTADOS_PEDIDO, ESTADO_PEDIDO_ETIQUETA, type EstadoPedido } from "@/lib/schemas/pedido";

// Barra de acciones masivas del panel de Pedidos — aparece solo con
// selección activa (mismo patrón que InventarioBulkBarra.tsx). A diferencia
// de Inventario (un solo botón fijo), acá el cambio de estado en lote
// necesita elegir A QUÉ estado, así que lleva su propio <select> + botón
// "Aplicar".
interface Props {
  cantidad: number;
  aplicando: boolean;
  onCambiarEstado: (estado: EstadoPedido) => void;
  onExportar: () => void;
  onCancelar: () => void;
}

export function PedidosBulkBarra({ cantidad, aplicando, onCambiarEstado, onExportar, onCancelar }: Props) {
  const [estadoElegido, setEstadoElegido] = useState<EstadoPedido>("en_proceso");

  if (cantidad === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-accent-600/30 bg-accent-100 px-4 py-3">
      <span className="text-sm font-medium text-ink-900">
        {cantidad} pedido{cantidad === 1 ? "" : "s"} seleccionado{cantidad === 1 ? "" : "s"}
      </span>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <select
          value={estadoElegido}
          onChange={(e) => setEstadoElegido(e.target.value as EstadoPedido)}
          aria-label="Cambiar estado de los pedidos seleccionados a"
          className="rounded-full border border-ink-200 bg-paper-raised px-3 py-1.5 text-xs font-medium text-ink-900 focus:border-accent-600"
        >
          {ESTADOS_PEDIDO.map((e) => (
            <option key={e} value={e}>
              {ESTADO_PEDIDO_ETIQUETA[e]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onCambiarEstado(estadoElegido)}
          disabled={aplicando}
          className="rounded-full bg-ink-900 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {aplicando ? "Aplicando…" : "Cambiar estado"}
        </button>
        <button
          type="button"
          onClick={onExportar}
          className="rounded-full border border-ink-200 bg-paper-raised px-3.5 py-1.5 text-xs font-medium text-ink-900 transition-colors hover:border-ink-900"
        >
          Exportar selección
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-full px-3.5 py-1.5 text-xs font-medium text-ink-500 transition-colors hover:text-ink-900"
        >
          Cancelar selección
        </button>
      </div>
    </div>
  );
}
