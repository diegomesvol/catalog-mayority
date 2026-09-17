"use client";

import { useEffect, useId, useRef, useState } from "react";

interface Props {
  etiqueta: string;
  opciones: string[];
  seleccionados: string[];
  onChange: (nuevos: string[]) => void;
}

// Dropdown de selección múltiple para Categoría/Marca/Género/Línea/Color del
// catálogo público — reemplaza los grupos de badges/el <select> nativo de
// antes (Filtros.tsx) por un menú desplegable con checkboxes. Abrir/cerrar
// sigue el mismo patrón que CuentaClienteMenu (click afuera + Escape).
// Oculto del todo si no hay opciones (ej. el catálogo no tiene "línea"
// cargada), igual que antes.
export function DropdownMultiple({ etiqueta, opciones, seleccionados, onChange }: Props) {
  const [abierto, setAbierto] = useState(false);
  // Cuando el botón está cerca del borde derecho de la pantalla (ej. la
  // última columna de la grilla de 2/3/5 de Filtros.tsx), anclar el panel
  // por "left-0" lo empuja fuera del viewport — antes se veía cortado o
  // directamente inaccesible en mobile (hallazgo Alto de la auditoría
  // 2026-09-17). Se mide en cuanto se abre y, si no entra a la derecha, se
  // ancla por "right-0" en su lugar.
  const [alinearDerecha, setAlinearDerecha] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const idPanel = useId();
  const ANCHO_PANEL_PX = 224; // w-56

  useEffect(() => {
    if (!abierto) return;
    const rect = contenedorRef.current?.getBoundingClientRect();
    if (rect) {
      const margen = 16; // mismo margen que max-w-[calc(100vw-2rem)] de abajo
      setAlinearDerecha(rect.left + ANCHO_PANEL_PX > window.innerWidth - margen);
    }
    function onPointerDown(e: MouseEvent) {
      if (!contenedorRef.current?.contains(e.target as Node)) setAbierto(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [abierto]);

  if (opciones.length === 0) return null;

  function toggle(opcion: string) {
    onChange(seleccionados.includes(opcion) ? seleccionados.filter((v) => v !== opcion) : [...seleccionados, opcion]);
  }

  const activos = seleccionados.length;

  return (
    <div ref={contenedorRef} className="relative w-full">
      {/* "w-full justify-between": a diferencia de la versión anterior (ancho
          según el texto), acá el botón se estira a lo que le dé la grilla
          simétrica de Filtros.tsx — las 5 columnas (Categoría/Marca/Género/
          Línea/Color) quedan del mismo ancho entre sí. */}
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="true"
        aria-expanded={abierto}
        aria-controls={idPanel}
        className={[
          "flex w-full items-center justify-between gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
          activos > 0
            ? "border-ink-900 bg-ink-900 text-white"
            : "border-ink-200 bg-paper-raised text-ink-900 hover:border-ink-900",
        ].join(" ")}
      >
        <span className="flex min-w-0 items-center gap-1 truncate">
          <span className="truncate">{etiqueta}</span>
          {activos > 0 && <span aria-hidden="true">({activos})</span>}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
          className={`shrink-0 transition-transform ${abierto ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {abierto && (
        <div
          id={idPanel}
          role="group"
          aria-label={`Filtrar por ${etiqueta.toLowerCase()}`}
          className={`absolute z-20 mt-2 w-56 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-ink-200 bg-paper-raised py-2 shadow-xl ${
            alinearDerecha ? "right-0" : "left-0"
          }`}
        >
          <div className="flex items-center justify-between px-3.5 pb-1.5">
            <span className="text-xs font-medium text-ink-500">{etiqueta}</span>
            {activos > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs font-medium text-ink-500 underline-offset-2 hover:text-ink-900 hover:underline"
              >
                Limpiar filtro
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto">
            {opciones.map((o) => {
              const id = `${idPanel}-${o}`;
              const activa = seleccionados.includes(o);
              return (
                <label
                  key={o}
                  htmlFor={id}
                  className="flex cursor-pointer items-center gap-2.5 px-3.5 py-2 text-sm text-ink-900 transition-colors hover:bg-ink-100"
                >
                  <input
                    id={id}
                    type="checkbox"
                    checked={activa}
                    onChange={() => toggle(o)}
                    className="h-4 w-4 shrink-0 rounded border-ink-300 text-accent-600 focus:ring-accent-600"
                  />
                  <span className="truncate">{o}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
