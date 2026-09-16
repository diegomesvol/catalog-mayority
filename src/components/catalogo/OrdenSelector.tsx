"use client";

import { useId } from "react";
import type { OrdenCatalogo } from "@/lib/producto";

const OPCIONES: { valor: OrdenCatalogo; etiqueta: string }[] = [
  { valor: "", etiqueta: "Relevancia" },
  { valor: "precio-asc", etiqueta: "Precio: menor a mayor" },
  { valor: "precio-desc", etiqueta: "Precio: mayor a menor" },
  { valor: "alfabetico-asc", etiqueta: "Alfabético: A-Z" },
  { valor: "alfabetico-desc", etiqueta: "Alfabético: Z-A" },
  { valor: "stock-desc", etiqueta: "Mayor disponibilidad" },
];

// Selector de orden de la grilla — separado de Filtros.tsx a propósito:
// ordenar no reduce qué productos aparecen (a diferencia de un filtro), así
// que vive junto al conteo de resultados en vez de adentro del panel de
// filtros (ver CatalogoClient.tsx). Mismo mecanismo de URL/localStorage que
// el resto de los filtros ("orden=", ver Filtros.tsx), para que un link
// compartido conserve también el orden elegido.
export function OrdenSelector({ valor, onChange }: { valor: OrdenCatalogo; onChange: (v: OrdenCatalogo) => void }) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="whitespace-nowrap text-xs font-medium text-ink-500">
        Ordenar por
      </label>
      <select
        id={id}
        value={valor}
        onChange={(e) => onChange(e.target.value as OrdenCatalogo)}
        className="rounded-lg border border-ink-200 bg-paper-raised px-3 py-1.5 text-xs font-medium text-ink-900 focus:border-accent-600"
      >
        {OPCIONES.map((o) => (
          <option key={o.valor || "relevancia"} value={o.valor}>
            {o.etiqueta}
          </option>
        ))}
      </select>
    </div>
  );
}
