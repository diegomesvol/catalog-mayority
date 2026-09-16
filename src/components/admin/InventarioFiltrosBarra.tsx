"use client";

import { useId } from "react";
import type { EstadoStock } from "@/lib/inventario";

const OPCIONES_ESTADO: { valor: EstadoStock | ""; etiqueta: string }[] = [
  { valor: "", etiqueta: "Todos los estados" },
  { valor: "disponible", etiqueta: "Disponible" },
  { valor: "bajo", etiqueta: "Bajo stock" },
  { valor: "agotado", etiqueta: "Agotado" },
];

interface Props {
  busqueda: string;
  onBusqueda: (v: string) => void;
  estado: EstadoStock | "";
  onEstado: (v: EstadoStock | "") => void;
  marca: string;
  onMarca: (v: string) => void;
  marcas: string[];
  linea: string;
  onLinea: (v: string) => void;
  lineas: string[];
  categoria: string;
  onCategoria: (v: string) => void;
  categorias: string[];
  onExportarTodo: () => void;
}

// Búsqueda global + filtros combinados del Panel de Inventario — todo sobre
// datos ya cargados en el cliente (mismo criterio que Filtros.tsx del
// catálogo público), sin ida y vuelta al servidor por cada tecla.
export function InventarioFiltrosBarra({
  busqueda,
  onBusqueda,
  estado,
  onEstado,
  marca,
  onMarca,
  marcas,
  linea,
  onLinea,
  lineas,
  categoria,
  onCategoria,
  categorias,
  onExportarTodo,
}: Props) {
  return (
    // "min-w-0": sin esto, un <select> con una opción de texto largo (una
    // marca o línea con nombre extenso) no se achica por debajo de su
    // contenido como flex item y empuja la fila entera más ancha que la
    // pantalla — mismo tipo de fuga que soluciona min-w-0 en AdminHeader.tsx,
    // pero acá hace falta explícito porque un <select> no es un contenedor
    // con overflow propio (no se beneficia del min-width:auto→0 automático
    // que sí aplica a un div con overflow-x-auto, como el de la tabla).
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="min-w-0 flex-1 sm:min-w-[220px]">
        <label htmlFor="inventario-busqueda" className="mb-1 block text-xs font-medium text-ink-500">
          Buscar
        </label>
        <input
          id="inventario-busqueda"
          type="search"
          value={busqueda}
          onChange={(e) => onBusqueda(e.target.value)}
          placeholder="SKU, producto, marca o línea…"
          className="w-full rounded-lg border border-ink-200 bg-paper-raised px-3 py-2 text-sm focus:border-accent-600"
        />
      </div>

      <Select etiqueta="Estado" value={estado} onChange={(v) => onEstado(v as EstadoStock | "")} opciones={OPCIONES_ESTADO} />
      <SelectSimple etiqueta="Marca" value={marca} onChange={onMarca} opciones={marcas} todas="Todas las marcas" />
      <SelectSimple etiqueta="Línea" value={linea} onChange={onLinea} opciones={lineas} todas="Todas las líneas" />
      {categorias.length > 1 && (
        <SelectSimple etiqueta="Categoría" value={categoria} onChange={onCategoria} opciones={categorias} todas="Calzado y accesorios" />
      )}

      <button
        type="button"
        onClick={onExportarTodo}
        className="rounded-full border border-ink-200 bg-paper-raised px-3.5 py-2 text-xs font-medium text-ink-900 transition-colors hover:border-ink-900 sm:ml-auto"
      >
        Exportar a Excel
      </button>
    </div>
  );
}

function Select({
  etiqueta,
  value,
  onChange,
  opciones,
}: {
  etiqueta: string;
  value: string;
  onChange: (v: string) => void;
  opciones: { valor: string; etiqueta: string }[];
}) {
  const id = useId();
  return (
    <div className="min-w-0 max-w-full">
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-ink-500">
        {etiqueta}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full max-w-full truncate rounded-lg border border-ink-200 bg-paper-raised px-3 py-2 text-sm text-ink-900 focus:border-accent-600"
      >
        {opciones.map((o) => (
          <option key={o.valor || "todos"} value={o.valor}>
            {o.etiqueta}
          </option>
        ))}
      </select>
    </div>
  );
}

function SelectSimple({
  etiqueta,
  value,
  onChange,
  opciones,
  todas,
}: {
  etiqueta: string;
  value: string;
  onChange: (v: string) => void;
  opciones: string[];
  todas: string;
}) {
  const id = useId();
  return (
    <div className="min-w-0 max-w-full">
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-ink-500">
        {etiqueta}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full max-w-full truncate rounded-lg border border-ink-200 bg-paper-raised px-3 py-2 text-sm text-ink-900 focus:border-accent-600"
      >
        <option value="">{todas}</option>
        {opciones.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
