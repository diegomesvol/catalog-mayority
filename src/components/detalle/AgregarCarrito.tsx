"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useCarrito } from "@/components/carrito/CarritoContext";
import { esCalzado } from "@/lib/transform";
import { armarItemId } from "@/lib/carrito";
import { unidadesDisponiblesCurva } from "@/lib/producto";
import type { Curva, Producto, VarianteColor } from "@/lib/types";

interface Props {
  producto: Producto;
  color: VarianteColor;
  curva: Curva;
}

export function AgregarCarrito({ producto, color, curva }: Props) {
  const { agregarItem, abrir } = useCarrito();
  const [cantidad, setCantidad] = useState(1);
  const calzado = esCalzado(producto.rubro);
  // Tope real de stock de esta curva — ver unidadesDisponiblesCurva. Acota
  // el stepper para que no se pueda ni siquiera escribir un pedido inicial
  // más grande de lo que hay (agregarItem, del lado del contexto, vuelve a
  // acotar por las dudas si ya había cantidad de esta misma línea).
  const stockDisponible = unidadesDisponiblesCurva(curva);

  function cambiarCantidad(valor: string) {
    const n = Math.floor(Number(valor));
    const acotado = Number.isFinite(n) && n > 0 ? n : 1;
    setCantidad(Math.min(acotado, stockDisponible));
  }

  function agregar() {
    agregarItem(
      {
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
        esCalzado: calzado,
        stockDisponible,
      },
      cantidad,
    );
    const unidad = calzado ? (cantidad === 1 ? "bulto" : "bultos") : cantidad === 1 ? "unidad" : "unidades";
    toast.success(`Agregado al pedido: ${cantidad} ${unidad}.`, {
      action: { label: "Ver pedido", onClick: abrir },
    });
  }

  return (
    <div className="flex items-center gap-3 border-t border-ink-200 pt-4">
      <div className="flex items-center rounded-lg border border-ink-200">
        <button
          type="button"
          onClick={() => setCantidad((c) => Math.max(1, c - 1))}
          aria-label="Restar"
          className="px-3 py-2.5 text-ink-700 hover:text-ink-900"
        >
          −
        </button>
        <input
          type="number"
          min={1}
          max={stockDisponible}
          inputMode="numeric"
          value={cantidad}
          onChange={(e) => cambiarCantidad(e.target.value)}
          aria-label={calzado ? "Cantidad de bultos" : "Cantidad de unidades"}
          className="w-14 border-x border-ink-200 py-2.5 text-center text-sm"
        />
        <button
          type="button"
          onClick={() => setCantidad((c) => Math.min(c + 1, stockDisponible))}
          disabled={cantidad >= stockDisponible}
          aria-label="Sumar"
          className="px-3 py-2.5 text-ink-700 hover:text-ink-900 disabled:cursor-not-allowed disabled:text-ink-300 disabled:hover:text-ink-300"
        >
          +
        </button>
      </div>
      <button
        type="button"
        onClick={agregar}
        disabled={stockDisponible <= 0}
        className="flex-1 rounded-full bg-ink-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Agregar al pedido{calzado ? ` (${cantidad * curva.cantidadPorBulto} pares)` : ""}
      </button>
    </div>
  );
}
