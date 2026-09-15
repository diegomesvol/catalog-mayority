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
