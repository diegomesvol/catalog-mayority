import { ESTADO_PEDIDO_ETIQUETA, type EstadoPedido } from "@/lib/schemas/pedido";

// Badge de estado de pedido — compartido entre el panel admin
// (PedidosTabla/PedidoDetalleModal) y las páginas de pedidos del cliente
// (antes cada una redefinía su propio Record de clases/etiquetas para los
// mismos 4 —ahora 5— estados). Mismos tokens success/warning/danger/info de
// globals.css que ya usa el resto del proyecto (ver EstadoStockBadge).
const ESTILOS: Record<EstadoPedido, string> = {
  pendiente: "border-warning-600/30 bg-warning-100 text-warning-600",
  en_proceso: "border-accent-600/30 bg-accent-100 text-accent-600",
  enviado: "border-info-600/30 bg-info-100 text-info-600",
  entregado: "border-success-600/30 bg-success-100 text-success-600",
  cancelado: "border-danger-600/30 bg-danger-100 text-danger-600",
};

export function EstadoPedidoBadge({ estado }: { estado: EstadoPedido }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${ESTILOS[estado]}`}>
      {ESTADO_PEDIDO_ETIQUETA[estado]}
    </span>
  );
}
