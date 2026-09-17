const formateadorPrecio = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

export function formatearPrecio(valor: number): string {
  return formateadorPrecio.format(valor);
}

export function tieneStock(tallas: { disponible: number }[]): boolean {
  return tallas.some((t) => t.disponible > 0);
}

// Fechas en español (es-VE) — antes cada pantalla que mostraba una fecha
// (cliente/page.tsx, cliente/pedidos/[id]/page.tsx, ClientesAdmin.tsx,
// PedidosTabla.tsx, PedidoDetalleModal.tsx) definía su propia función local
// "formatearFecha"/"formatearFechaHora" con el mismo new Date().toLocale...
// repetido 5 veces, solo variando "short" vs "long" para el mes. Centralizado
// acá (auditoría 2026-09-17) — un solo lugar para cambiar el idioma/formato
// el día que haga falta.
export function formatearFecha(iso: string, opciones: { mes?: "short" | "long" } = {}): string {
  return new Date(iso).toLocaleDateString("es-VE", { day: "2-digit", month: opciones.mes ?? "short", year: "numeric" });
}

export function formatearFechaHora(iso: string, opciones: { mes?: "short" | "long" } = {}): string {
  return new Date(iso).toLocaleString("es-VE", {
    day: "2-digit",
    month: opciones.mes ?? "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Iniciales para el avatar de respaldo (sin foto de Google ni logo de la
 * tienda) — ver CuentaClienteMenu y MenuMovilCatalogo, los dos lugares que
 * muestran quién está logueado en el catálogo público. */
export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const primera = partes[0][0];
  const segunda = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primera + segunda).toUpperCase();
}
