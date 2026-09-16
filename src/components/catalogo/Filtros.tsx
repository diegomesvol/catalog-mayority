"use client";

import { useId, useState } from "react";
import type { OrdenCatalogo } from "@/lib/producto";

export interface ValorFiltros {
  busqueda: string;
  marca: string[];
  genero: string[];
  color: string[];
  categoria: string; // rubro: CALZADO / ACCESORIOS — sigue siendo único, no hay ambigüedad entre "calzado" y "accesorios" a la vez
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
  categoria: "",
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
// Marca/Género/Color/Línea aceptan más de un valor a la vez — se guardan
// separados por coma en un único param (ej. "marca=Volpe,Kriza"), mismo
// criterio que ya usaba "talla" antes de este cambio.
export function filtrosDesdeParams(sp: URLSearchParams): ValorFiltros {
  return {
    busqueda: sp.get("q") ?? "",
    marca: listaDesdeParam(sp, "marca"),
    genero: listaDesdeParam(sp, "genero"),
    color: listaDesdeParam(sp, "color"),
    categoria: sp.get("cat") ?? "",
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
  if (filtros.categoria) sp.set("cat", filtros.categoria);
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

type CampoMultiple = "marca" | "genero" | "color" | "linea";

function contarActivos(v: ValorFiltros): number {
  return (
    v.marca.length +
    v.genero.length +
    v.color.length +
    v.linea.length +
    (v.categoria ? 1 : 0) +
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

  // Un mismo toggle sirve para Marca/Género/Color/Línea: todos son arrays de
  // selección múltiple con la misma forma (agregar/quitar un valor).
  function toggleMultiple(campo: CampoMultiple, opcion: string) {
    const actual = valor[campo];
    set(campo, actual.includes(opcion) ? actual.filter((v) => v !== opcion) : [...actual, opcion]);
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
  if (valor.categoria) {
    chips.push({ id: "categoria", etiqueta: `Categoría: ${valor.categoria}`, quitar: () => set("categoria", "") });
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

      <div id={idPanel} className={`${abierto ? "flex" : "hidden"} flex-col gap-4 lg:flex`}>
        {categorias.length > 1 && (
          <div className="max-w-xs">
            <Select
              etiqueta="Categoría"
              value={valor.categoria}
              onChange={(v) => set("categoria", v)}
              opciones={categorias}
              todas="Calzado y accesorios"
            />
          </div>
        )}

        <GrupoOpciones etiqueta="Marca" seleccionados={valor.marca} opciones={marcas} onToggle={(v) => toggleMultiple("marca", v)} />
        <GrupoOpciones etiqueta="Género" seleccionados={valor.genero} opciones={generos} onToggle={(v) => toggleMultiple("genero", v)} />
        <GrupoOpciones etiqueta="Línea" seleccionados={valor.linea} opciones={lineas} onToggle={(v) => toggleMultiple("linea", v)} />
        <GrupoOpciones etiqueta="Color" seleccionados={valor.color} opciones={colores} onToggle={(v) => toggleMultiple("color", v)} />
        <GrupoOpciones etiqueta="Talla" seleccionados={valor.tallas} opciones={tallas} onToggle={toggleTalla} />

        <label
          className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
            valor.soloDisponibles ? "bg-ink-900 font-medium text-white" : "text-ink-900"
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
    </div>
  );
}

// Grupo de badges de selección múltiple (checkboxes visuales) — mismo look
// que ya tenía el filtro de Talla, reutilizado ahora también para
// Marca/Género/Línea/Color en vez del <select> nativo de antes: permite
// marcar varios valores a la vez sin un menú desplegable por medio. Oculto
// del todo si no hay opciones (ej. el catálogo no tiene "línea" cargada).
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

function Select({
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
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-ink-500">
        {etiqueta}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-accent-600 ${
          value ? "border-ink-900 bg-ink-900 font-medium text-white" : "border-ink-200 bg-paper-raised text-ink-900"
        }`}
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
