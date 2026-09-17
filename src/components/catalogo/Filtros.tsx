"use client";

import { useId, useState } from "react";
import type { OrdenCatalogo } from "@/lib/producto";
import { DropdownMultiple } from "./DropdownMultiple";

export interface ValorFiltros {
  busqueda: string;
  marca: string[];
  genero: string[];
  color: string[];
  categoria: string[]; // rubro: CALZADO / ACCESORIOS — ahora admite varios a la vez, mismo criterio que marca/género/línea/color
  linea: string[];
  tallas: string[];
  soloDisponibles: boolean;
  orden: OrdenCatalogo;
}

export const FILTROS_VACIOS: ValorFiltros = {
  busqueda: "",
  marca: [],
  genero: [],
  color: [],
  categoria: [],
  linea: [],
  tallas: [],
  soloDisponibles: false,
  orden: "",
};

function listaDesdeParam(sp: URLSearchParams, clave: string): string[] {
  const valor = sp.get(clave);
  return valor ? valor.split(",").filter(Boolean) : [];
}

// Los filtros se reflejan en la URL (query string) para que: 1) el botón
// "atrás" del navegador y el link "Volver al catálogo" restauren exactamente
// lo que se estaba viendo, y 2) el link se pueda compartir ya filtrado.
// Categoría/Marca/Género/Color/Línea aceptan más de un valor a la vez — se
// guardan separados por coma en un único param (ej. "marca=Volpe,Kriza"),
// mismo criterio que ya usaba "talla" antes de este cambio.
export function filtrosDesdeParams(sp: URLSearchParams): ValorFiltros {
  return {
    busqueda: sp.get("q") ?? "",
    marca: listaDesdeParam(sp, "marca"),
    genero: listaDesdeParam(sp, "genero"),
    color: listaDesdeParam(sp, "color"),
    categoria: listaDesdeParam(sp, "cat"),
    linea: listaDesdeParam(sp, "linea"),
    tallas: listaDesdeParam(sp, "talla"),
    soloDisponibles: sp.get("disp") === "1",
    orden: (sp.get("orden") as OrdenCatalogo) ?? "",
  };
}

export function paramsDesdeFiltros(filtros: ValorFiltros, pagina: number): URLSearchParams {
  const sp = new URLSearchParams();
  if (filtros.busqueda.trim()) sp.set("q", filtros.busqueda.trim());
  if (filtros.marca.length > 0) sp.set("marca", filtros.marca.join(","));
  if (filtros.genero.length > 0) sp.set("genero", filtros.genero.join(","));
  if (filtros.color.length > 0) sp.set("color", filtros.color.join(","));
  if (filtros.categoria.length > 0) sp.set("cat", filtros.categoria.join(","));
  if (filtros.linea.length > 0) sp.set("linea", filtros.linea.join(","));
  if (filtros.tallas.length > 0) sp.set("talla", filtros.tallas.join(","));
  if (filtros.soloDisponibles) sp.set("disp", "1");
  if (filtros.orden) sp.set("orden", filtros.orden);
  if (pagina > 1) sp.set("pagina", String(pagina));
  return sp;
}

interface Props {
  marcas: string[];
  generos: string[];
  colores: string[];
  categorias: string[];
  lineas: string[];
  tallas: string[];
  valor: ValorFiltros;
  onChange: (valor: ValorFiltros) => void;
}

function contarActivos(v: ValorFiltros): number {
  return (
    v.marca.length +
    v.genero.length +
    v.color.length +
    v.linea.length +
    v.categoria.length +
    (v.tallas.length > 0 ? 1 : 0) +
    (v.soloDisponibles ? 1 : 0)
  );
}

export function Filtros({ marcas, generos, colores, categorias, lineas, tallas, valor, onChange }: Props) {
  const [abierto, setAbierto] = useState(false);
  const idPanel = useId();
  const activos = contarActivos(valor);

  function set<K extends keyof ValorFiltros>(campo: K, v: ValorFiltros[K]) {
    onChange({ ...valor, [campo]: v });
  }

  function toggleTalla(t: string) {
    const activa = valor.tallas.includes(t);
    set("tallas", activa ? valor.tallas.filter((x) => x !== t) : [...valor.tallas, t]);
  }

  // Un chip por valor seleccionado (no uno agregado por filtro): así el
  // comprador puede quitar, por ejemplo, solo "Volpe" de una selección de
  // marca "Volpe + Kriza" sin perder la otra.
  const chips: { id: string; etiqueta: string; quitar: () => void }[] = [];
  if (valor.busqueda.trim()) {
    chips.push({ id: "busqueda", etiqueta: `Buscar: "${valor.busqueda.trim()}"`, quitar: () => set("busqueda", "") });
  }
  for (const cat of valor.categoria) {
    chips.push({
      id: `categoria-${cat}`,
      etiqueta: `Categoría: ${cat}`,
      quitar: () => set("categoria", valor.categoria.filter((x) => x !== cat)),
    });
  }
  for (const m of valor.marca) {
    chips.push({ id: `marca-${m}`, etiqueta: `Marca: ${m}`, quitar: () => set("marca", valor.marca.filter((x) => x !== m)) });
  }
  for (const g of valor.genero) {
    chips.push({ id: `genero-${g}`, etiqueta: `Género: ${g}`, quitar: () => set("genero", valor.genero.filter((x) => x !== g)) });
  }
  for (const l of valor.linea) {
    chips.push({ id: `linea-${l}`, etiqueta: `Línea: ${l}`, quitar: () => set("linea", valor.linea.filter((x) => x !== l)) });
  }
  for (const c of valor.color) {
    chips.push({ id: `color-${c}`, etiqueta: `Color: ${c}`, quitar: () => set("color", valor.color.filter((x) => x !== c)) });
  }
  if (valor.tallas.length > 0) {
    chips.push({
      id: "tallas",
      etiqueta: `Talla${valor.tallas.length > 1 ? "s" : ""}: ${valor.tallas.join(", ")}`,
      quitar: () => set("tallas", []),
    });
  }
  if (valor.soloDisponibles) {
    chips.push({ id: "soloDisponibles", etiqueta: "Solo con stock", quitar: () => set("soloDisponibles", false) });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* El input de búsqueda se mudó al navbar (BuscadorNavbar) — acá solo
          queda el botón que despliega el resto de los filtros en mobile. */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          aria-expanded={abierto}
          aria-controls={idPanel}
          onClick={() => setAbierto((v) => !v)}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-ink-200 bg-paper-raised px-4 py-2.5 text-sm font-medium text-ink-900 lg:hidden"
        >
          Filtros
          {activos > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-600 px-1 text-xs font-semibold text-white">
              {activos}
            </span>
          )}
        </button>
      </div>



      <div id={idPanel} className={`${abierto ? "flex" : "hidden"} flex-col gap-4 lg:flex`}>
        {/* Los 5 filtros unificados en un mismo look (dropdown + checkboxes):
            grilla simétrica que reparte el ancho en partes iguales entre
            columnas — 2 por fila en mobile, 3 en tablet, las 5 en una sola
            fila en desktop ("lg"). Si el catálogo solo tiene un rubro
            (categorías.length <= 1) ese dropdown ni se muestra — sin eso
            para elegir, no tendría sentido ofrecerlo. */}
        <div className="mx-auto grid w-full grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {categorias.length > 1 && (
            <DropdownMultiple etiqueta="Categoría" opciones={categorias} seleccionados={valor.categoria} onChange={(v) => set("categoria", v)} />
          )}
          <DropdownMultiple etiqueta="Marca" opciones={marcas} seleccionados={valor.marca} onChange={(v) => set("marca", v)} />
          <DropdownMultiple etiqueta="Género" opciones={generos} seleccionados={valor.genero} onChange={(v) => set("genero", v)} />
          <DropdownMultiple etiqueta="Línea" opciones={lineas} seleccionados={valor.linea} onChange={(v) => set("linea", v)} />
          <DropdownMultiple etiqueta="Color" opciones={colores} seleccionados={valor.color} onChange={(v) => set("color", v)} />
        </div>

        <GrupoOpciones etiqueta="Talla" seleccionados={valor.tallas} opciones={tallas} onToggle={toggleTalla} />

        <label
          className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${valor.soloDisponibles ? "bg-ink-900 font-medium text-white" : "text-ink-900"
            }`}
        >
          <input
            type="checkbox"
            checked={valor.soloDisponibles}
            onChange={(e) => set("soloDisponibles", e.target.checked)}
            className="h-4 w-4 rounded border-ink-300 text-accent-600 focus:ring-accent-600"
          />
          Solo mostrar productos con stock disponible
        </label>
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={chip.quitar}
              className="inline-flex items-center gap-1 rounded-full border border-ink-900 bg-ink-900 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:opacity-80"
            >
              {chip.etiqueta}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
          {chips.length > 1 && (
            <button
              type="button"
              onClick={() => onChange(FILTROS_VACIOS)}
              className="text-xs font-medium text-ink-500 underline-offset-2 hover:underline"
            >
              Limpiar todo
            </button>
          )}
        </div>
      )}

    </div>
  );
}

// Grupo de badges de selección múltiple (checkboxes visuales), usado solo
// para Talla — el resto de los filtros pasaron a DropdownMultiple (menú
// desplegable) para no ocupar tanto espacio vertical con catálogos de
// muchas opciones. Oculto del todo si no hay opciones.
function GrupoOpciones({
  etiqueta,
  seleccionados,
  opciones,
  onToggle,
}: {
  etiqueta: string;
  seleccionados: string[];
  opciones: string[];
  onToggle: (valor: string) => void;
}) {
  if (opciones.length === 0) return null;
  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium text-ink-500">{etiqueta}</span>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Filtrar por ${etiqueta.toLowerCase()}`}>
        {opciones.map((o) => {
          const activa = seleccionados.includes(o);
          return (
            <button
              key={o}
              type="button"
              aria-pressed={activa}
              onClick={() => onToggle(o)}
              className={[
                "min-w-9 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                activa
                  ? "border-ink-900 bg-ink-900 text-white"
                  : "border-ink-200 bg-paper-raised text-ink-900 hover:border-ink-900",
              ].join(" ")}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}
