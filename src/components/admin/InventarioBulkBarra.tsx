"use client";

// Barra de acciones masivas — aparece solo con selección activa. Dos
// acciones bien definidas en vez de un "ajustar stock" genérico: un número
// fijo aplicado a bulk no tiene un significado único (cada producto trae
// tallas/curvas distintas), así que se limita a lo que SÍ es inequívoco
// para cualquier selección: marcar todo en 0 (agotado) o exportar.
interface Props {
  cantidad: number;
  agotando: boolean;
  onAgotar: () => void;
  onExportar: () => void;
  onCancelar: () => void;
}

export function InventarioBulkBarra({ cantidad, agotando, onAgotar, onExportar, onCancelar }: Props) {
  if (cantidad === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-accent-600/30 bg-accent-100 px-4 py-3">
      <span className="text-sm font-medium text-ink-900">
        {cantidad} producto{cantidad === 1 ? "" : "s"} seleccionado{cantidad === 1 ? "" : "s"}
      </span>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onExportar}
          className="rounded-full border border-ink-200 bg-paper-raised px-3.5 py-1.5 text-xs font-medium text-ink-900 transition-colors hover:border-ink-900"
        >
          Exportar selección
        </button>
        <button
          type="button"
          onClick={onAgotar}
          disabled={agotando}
          className="rounded-full border border-danger-600/30 bg-paper-raised px-3.5 py-1.5 text-xs font-medium text-danger-600 transition-colors hover:bg-danger-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {agotando ? "Actualizando…" : "Marcar como agotados"}
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
