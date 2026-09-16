// Recalcula un pedido del lado del servidor contra el catálogo publicado.
// El navegador manda productoId/color/curvaId/cantidad; precio, código SAP,
// pares por bulto, etc. se toman SIEMPRE del catálogo vigente — nunca del
// body (antes se guardaba tal cual, así que un cliente podía mandar precio 0
// o un total arbitrario, ya sea por /api/cliente/pedidos o pegándole directo
// a PostgREST con su propio JWT).
//
// Stock: se mantiene el criterio documentado en lib/carrito.ts — no es una
// reserva y no bloquea el pedido; stockDisponible se refresca con el valor
// real del catálogo para que el admin lo vea al momento del pedido.

import type { Catalogo } from "./types";
import { armarItemId, totalCarrito, type ItemCarrito } from "./carrito";
import { buscarColor, buscarCurva, unidadesDisponiblesCurva } from "./producto";
import { esCalzado } from "./transform";

export interface ItemSolicitado {
  productoId: string;
  color: string;
  curvaId: string;
  cantidad: number;
  modelo?: string;
}

export type ResultadoRecalculo =
  | { ok: true; items: ItemCarrito[]; total: number }
  | { ok: false; mensaje: string };

export function recalcularPedido(catalogo: Catalogo, solicitados: ItemSolicitado[]): ResultadoRecalculo {
  const { items, faltantes } = resolverItems(catalogo, solicitados);
  if (faltantes.length > 0) {
    const s = faltantes[0];
    const etiqueta = [s.modelo, s.color].filter(Boolean).join(" ") || s.productoId;
    return { ok: false, mensaje: `"${etiqueta}" ya no está disponible en el catálogo vigente. Actualizá tu carrito.` };
  }

  // Redondeo a centavos: la columna es numeric(10,2).
  const total = Math.round(totalCarrito(items) * 100) / 100;
  return { ok: true, items, total };
}

/**
 * Para sincronizar el carrito guardado en el navegador con el catálogo
 * vigente (precios/stock actualizados, líneas que ya no existen). A
 * diferencia de recalcularPedido, no corta en el primer faltante.
 */
export function resolverItems(
  catalogo: Catalogo,
  solicitados: ItemSolicitado[],
): { items: ItemCarrito[]; faltantes: ItemSolicitado[] } {
  const porId = new Map(catalogo.productos.map((p) => [p.id, p]));
  const items: ItemCarrito[] = [];
  const faltantes: ItemSolicitado[] = [];

  for (const s of solicitados) {
    const producto = porId.get(s.productoId);
    const color = producto ? buscarColor(producto, s.color) : undefined;
    const curva = color ? buscarCurva(color, s.curvaId) : undefined;
    if (!producto || !color || !curva) {
      faltantes.push(s);
      continue;
    }

    items.push({
      itemId: armarItemId(producto.id, color.color, curva.id),
      productoId: producto.id,
      modelo: producto.modelo,
      marca: producto.marca,
      color: color.color,
      curvaId: curva.id,
      curvaRango: curva.rango,
      codigoSap: curva.codigoSap,
      foto: color.fotos[0],
      precio: color.precio,
      cantidadPorBulto: curva.cantidadPorBulto,
      esCalzado: esCalzado(producto.rubro),
      cantidad: s.cantidad,
      stockDisponible: unidadesDisponiblesCurva(curva),
    });
  }

  return { items, faltantes };
}
