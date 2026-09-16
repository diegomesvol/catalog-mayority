import type { ResumenInventario } from "@/lib/inventario";
import { formatearPrecio } from "@/lib/format";

// 4 tarjetas resumen arriba de la tabla — mismo look que TarjetasSalud.tsx
// (Dashboard), reutilizado a propósito para que el panel se sienta parte de
// la misma app en vez de un estilo aparte.
export function InventarioKpis({ resumen }: { resumen: ResumenInventario }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Tarjeta etiqueta="Total de productos" valor={resumen.totalProductos.toLocaleString("es-VE")} />
      <Tarjeta etiqueta="Unidades en inventario" valor={resumen.unidadesTotales.toLocaleString("es-VE")} />
      <Tarjeta
        etiqueta="Alertas de stock"
        valor={resumen.alertasBajoStock.toLocaleString("es-VE")}
        ayuda="Productos en bajo stock o agotados."
        enfasis={resumen.alertasBajoStock > 0}
      />
      <Tarjeta etiqueta="Valor del inventario" valor={formatearPrecio(resumen.valorTotalInventario)} />
    </div>
  );
}

function Tarjeta({ etiqueta, valor, ayuda, enfasis }: { etiqueta: string; valor: string; ayuda?: string; enfasis?: boolean }) {
  return (
    <div
      className={`flex flex-col justify-between gap-2 rounded-xl border p-4 ${
        enfasis ? "border-danger-600/30 bg-danger-100" : "border-ink-200 bg-paper-raised"
      }`}
    >
      <span className="text-xs font-medium uppercase tracking-wide text-ink-500">{etiqueta}</span>
      <span className={`text-2xl font-semibold ${enfasis ? "text-danger-600" : "text-ink-900"}`}>{valor}</span>
      {ayuda && <span className="text-[11px] leading-snug text-ink-500">{ayuda}</span>}
    </div>
  );
}
