"use client";

import { ESTADOS_PEDIDO, ESTADO_PEDIDO_ETIQUETA, type EstadoPedido } from "@/lib/schemas/pedido";

// Barra de búsqueda + filtros del panel de Pedidos — mismo patrón que
// InventarioFiltrosBarra.tsx (search + <select> simples, combinables entre
// sí por AND). Sin filtro de "tipo de cliente" (mayorista/detal): este
// proyecto no tiene esa distinción en ningún lado del modelo de datos
// (confirmado con Diego) — solo estado + rango de fechas, como pidió.
interface Props {
  busqueda: string;
  onBusqueda: (v: string) => void;
  estado: EstadoPedido | "";
  onEstado: (v: EstadoPedido | "") => void;
  fechaDesde: string;
  onFechaDesde: (v: string) => void;
  fechaHasta: string;
  onFechaHasta: (v: string) => void;
  onExportarTodo: () => void;
}

export function PedidosFiltrosBarra({
  busqueda,
  onBusqueda,
  estado,
  onEstado,
  fechaDesde,
  onFechaDesde,
  fechaHasta,
  onFechaHasta,
  onExportarTodo,
}: Props) {
  return (
    // "min-w-0": mismo motivo que en InventarioFiltrosBarra — este es un
    // flex item de la columna que arma page.tsx/AdminHeader, y sin esto un
    // <select>/input ancho puede empujarlo más ancho que la pantalla en vez
    // de scrollear solo puntualmente.
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="min-w-0 flex-1 sm:min-w-[220px]">
        <label htmlFor="pedidos-busqueda" className="mb-1 block text-xs font-medium text-ink-500">
          Buscar
        </label>
        <input
          id="pedidos-busqueda"
          type="search"
          value={busqueda}
          onChange={(e) => onBusqueda(e.target.value)}
          placeholder="N.° de orden, cliente, empresa o RIF/cédula…"
          className="w-full rounded-lg border border-ink-200 bg-paper-raised px-3 py-2 text-sm text-ink-900 focus:border-accent-600"
        />
      </div>

      <div className="min-w-0 max-w-full">
        <label htmlFor="pedidos-estado" className="mb-1 block text-xs font-medium text-ink-500">
          Estado
        </label>
        <select
          id="pedidos-estado"
          value={estado}
          onChange={(e) => onEstado(e.target.value as EstadoPedido | "")}
          className="w-full max-w-full truncate rounded-lg border border-ink-200 bg-paper-raised px-3 py-2 text-sm text-ink-900 focus:border-accent-600"
        >
          <option value="">Todos los estados</option>
          {ESTADOS_PEDIDO.map((e) => (
            <option key={e} value={e}>
              {ESTADO_PEDIDO_ETIQUETA[e]}
            </option>
          ))}
        </select>
      </div>

      <div className="min-w-0 max-w-full">
        <label htmlFor="pedidos-fecha-desde" className="mb-1 block text-xs font-medium text-ink-500">
          Desde
        </label>
        <input
          id="pedidos-fecha-desde"
          type="date"
          value={fechaDesde}
          onChange={(e) => onFechaDesde(e.target.value)}
          className="w-full max-w-full rounded-lg border border-ink-200 bg-paper-raised px-3 py-2 text-sm text-ink-900 focus:border-accent-600"
        />
      </div>

      <div className="min-w-0 max-w-full">
        <label htmlFor="pedidos-fecha-hasta" className="mb-1 block text-xs font-medium text-ink-500">
          Hasta
        </label>
        <input
          id="pedidos-fecha-hasta"
          type="date"
          value={fechaHasta}
          onChange={(e) => onFechaHasta(e.target.value)}
          className="w-full max-w-full rounded-lg border border-ink-200 bg-paper-raised px-3 py-2 text-sm text-ink-900 focus:border-accent-600"
        />
      </div>

      <button
        type="button"
        onClick={onExportarTodo}
        className="rounded-full border border-ink-200 bg-paper-raised px-3.5 py-2 text-xs font-medium text-ink-900 transition-colors hover:border-ink-900 sm:ml-auto"
      >
        Exportar todo
      </button>
    </div>
  );
}
