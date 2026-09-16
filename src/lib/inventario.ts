// Cálculos derivados para el Panel de Inventario (/admin/inventario) —
// mismo criterio que lib/dashboard.ts (KPIs del Dashboard), pero enfocado
// en gestión de stock por producto en vez de salud general del catálogo.
// Todas las funciones son puras y aceptan cualquier forma compatible con
// Producto (incluye ProductoInventario de lib/blob.ts, que agrega el id de
// cada talla) — no dependen de esos ids, solo de las cantidades.

import type { Producto } from "./types";
import { stockTotalProducto } from "./producto";

export type EstadoStock = "disponible" | "bajo" | "agotado";

// Umbral que aplica cuando el producto todavía no tiene uno propio
// configurado (ver umbrales_stock_producto en Supabase) — 10 unidades es un
// punto de partida razonable para bultos de calzado mayorista, ajustable
// por producto desde el modal de edición rápida.
export const UMBRAL_STOCK_DEFECTO = 10;

export function umbralProducto(slug: string, umbrales: Record<string, number>): number {
  return umbrales[slug] ?? UMBRAL_STOCK_DEFECTO;
}

export function estadoStockProducto(producto: Producto, umbrales: Record<string, number>): EstadoStock {
  const total = stockTotalProducto(producto);
  if (total <= 0) return "agotado";
  if (total <= umbralProducto(producto.id, umbrales)) return "bajo";
  return "disponible";
}

/**
 * Valor del inventario de un producto: el precio vive POR COLOR (no hay un
 * único precio de producto), así que se suma color por color: precio de ese
 * color × unidades disponibles en ESE color (no el stock total del
 * producto, que mezclaría el precio de un color con el stock de otro).
 */
export function valorInventarioProducto(producto: Producto): number {
  return producto.colores.reduce((acc, color) => {
    const unidadesColor = color.curvas.reduce(
      (accCurva, curva) => accCurva + curva.tallas.reduce((accTalla, t) => accTalla + t.disponible, 0),
      0,
    );
    return acc + unidadesColor * color.precio;
  }, 0);
}

