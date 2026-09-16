import type { EstadoStock } from "@/lib/inventario";

const ESTILOS: Record<EstadoStock, string> = {
  disponible: "border-success-600/30 bg-success-100 text-success-600",
  bajo: "border-warning-600/30 bg-warning-100 text-warning-600",
  agotado: "border-danger-600/30 bg-danger-100 text-danger-600",
};

const ETIQUETAS: Record<EstadoStock, string> = {
  disponible: "En stock",
  bajo: "Bajo stock",
  agotado: "Agotado",
};

// Badge de estado — mismos tokens success/warning/danger de globals.css que
// ya usa el resto del panel (ver TarjetasSalud/AvisoModoDemo), en vez de
// instalar HeroUI solo para este componente (ver la nota grande en
// InventarioAdmin.tsx).
export function EstadoStockBadge({ estado }: { estado: EstadoStock }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${ESTILOS[estado]}`}>
      {ETIQUETAS[estado]}
    </span>
  );
}
