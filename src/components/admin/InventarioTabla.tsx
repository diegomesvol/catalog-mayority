"use client";

import type { ReactNode } from "react";
import { formatearPrecio } from "@/lib/format";
import type { ProductoInventario } from "@/lib/blob";
import type { EstadoStock } from "@/lib/inventario";
import { ImagenProducto } from "@/components/catalogo/ImagenProducto";
import { EstadoStockBadge } from "./EstadoStockBadge";

export type ColumnaOrdenInventario = "nombre" | "stock" | "precio";
export type DireccionOrden = "asc" | "desc";

export interface FilaInventario {
  producto: ProductoInventario;
  estado: EstadoStock;
  stockTotal: number;
  precioDesde: number;
  fotoUrl: string | undefined;
  coloresTexto: string;
  tallasTexto: string;
}

interface Props {
  filas: FilaInventario[];
  seleccionados: Set<string>;
  todosSeleccionados: boolean;
  orden: { columna: ColumnaOrdenInventario; direccion: DireccionOrden };
  onToggleFila: (slug: string) => void;
  onToggleTodos: () => void;
  onOrdenar: (columna: ColumnaOrdenInventario) => void;
  onEditar: (producto: ProductoInventario) => void;
}

// Tabla del Panel de Inventario — bordes limpios, hover claro, checkboxes,
// avatar de producto y badges de estado (ver la nota grande de por qué es
// Tailwind + los tokens del proyecto en vez de instalar HeroUI, en
// InventarioAdmin.tsx). "overflow-x-auto" en el contenedor: son 12 columnas,
// en mobile scrollea horizontal en vez de aplastar el contenido ilegible.
export function InventarioTabla({ filas, seleccionados, todosSeleccionados, orden, onToggleFila, onToggleTodos, onOrdenar, onEditar }: Props) {
  return (
    <div className="min-w-0 overflow-x-auto rounded-xl border border-ink-200">
      <table className="w-full min-w-[1100px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink-200 bg-ink-100 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
            <th className="w-10 px-3 py-2.5">
              <input
                type="checkbox"
                checked={todosSeleccionados}
                onChange={onToggleTodos}
                aria-label="Seleccionar todos los productos"
                className="h-4 w-4 rounded border-ink-300 text-accent-600 focus:ring-accent-600"
              />
            </th>
            <th className="px-3 py-2.5">Imagen</th>
            <th className="px-3 py-2.5">Código</th>
            <EncabezadoOrdenable columna="nombre" orden={orden} onOrdenar={onOrdenar}>
              Producto
            </EncabezadoOrdenable>
            <th className="px-3 py-2.5">Línea</th>
            <th className="px-3 py-2.5">Marca</th>
            <th className="px-3 py-2.5">Género</th>
            <th className="px-3 py-2.5">Colores</th>
            <th className="px-3 py-2.5">Tallas</th>
            <EncabezadoOrdenable columna="stock" orden={orden} onOrdenar={onOrdenar}>
              Stock total
            </EncabezadoOrdenable>
            <EncabezadoOrdenable columna="precio" orden={orden} onOrdenar={onOrdenar}>
              Precio
            </EncabezadoOrdenable>
            <th className="px-3 py-2.5">Estado</th>
            <th className="px-3 py-2.5">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-200">
          {filas.map(({ producto, estado, stockTotal, precioDesde, fotoUrl, coloresTexto, tallasTexto }) => {
            const activa = seleccionados.has(producto.id);
            return (
              <tr key={producto.id} className={`transition-colors ${activa ? "bg-accent-100/60" : "hover:bg-ink-100/60"}`}>
                <td className="px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={activa}
                    onChange={() => onToggleFila(producto.id)}
                    aria-label={`Seleccionar ${producto.modelo}`}
                    className="h-4 w-4 rounded border-ink-300 text-accent-600 focus:ring-accent-600"
                  />
                </td>
                <td className="px-3 py-2.5">
                  <ImagenProducto src={fotoUrl} alt={producto.modelo} className="h-10 w-10 shrink-0 rounded-lg" sizes="40px" />
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-ink-500">{producto.codigoModelo ?? "—"}</td>
                <td className="px-3 py-2.5 font-medium text-ink-900">{producto.modelo}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-ink-500">{producto.linea ?? "—"}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-ink-500">{producto.marca}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-ink-500">{producto.genero}</td>
                <td className="max-w-[180px] truncate px-3 py-2.5 text-ink-500" title={coloresTexto}>
                  {coloresTexto}
                </td>
                <td className="max-w-[160px] truncate px-3 py-2.5 text-ink-500" title={tallasTexto}>
                  {tallasTexto}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 font-medium text-ink-900">{stockTotal.toLocaleString("es-VE")}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-ink-900">{formatearPrecio(precioDesde)}</td>
                <td className="px-3 py-2.5">
                  <EstadoStockBadge estado={estado} />
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => onEditar(producto)}
                    className="rounded-full border border-ink-200 px-3 py-1 text-xs font-medium text-ink-900 transition-colors hover:border-ink-900"
                  >
                    Editar stock
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EncabezadoOrdenable({
  columna,
  orden,
  onOrdenar,
  children,
}: {
  columna: ColumnaOrdenInventario;
  orden: { columna: ColumnaOrdenInventario; direccion: DireccionOrden };
  onOrdenar: (columna: ColumnaOrdenInventario) => void;
  children: ReactNode;
}) {
  const activa = orden.columna === columna;
  return (
    <th className="px-3 py-2.5">
      <button
        type="button"
        onClick={() => onOrdenar(columna)}
        className={`flex items-center gap-1 whitespace-nowrap transition-colors hover:text-ink-900 ${activa ? "text-ink-900" : ""}`}
      >
        {children}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden="true"
          className={`shrink-0 transition-transform ${activa && orden.direccion === "desc" ? "rotate-180" : ""} ${activa ? "opacity-100" : "opacity-30"}`}
        >
          <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </th>
  );
}
