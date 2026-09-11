"use client";

import { useCargadorCatalogo, TAMANO_MAXIMO_BYTES, type OrigenCarga } from "@/hooks/useCargadorCatalogo";
import { ResumenPrevio } from "./ResumenPrevio";
import { GuiaColumnas } from "./GuiaColumnas";
import { TablaErrores } from "./TablaErrores";

interface Props {
  // true mientras otra operación crítica (revertir al respaldo) está en
  // curso — bloquea "Reemplazar catálogo" para que las dos no escriban
  // catalogo.json al mismo tiempo (ver PanelAdmin.tsx).
  bloqueadoPorOtraOperacion?: boolean;
  onOperacionCriticaChange?: (enCurso: boolean) => void;
}

export function CargadorCatalogo({ bloqueadoPorOtraOperacion, onOperacionCriticaChange }: Props) {
  const {
    origen,
    setOrigen,
    url,
    setUrl,
    estado,
    resumen,
    diff,
    nombreArchivo,
    setNombreArchivo,
    inputArchivoRef,
    subir,
    confirmar,
    cancelar,
    nuevaCarga,
  } = useCargadorCatalogo({ onOperacionCriticaChange });

  if (estado === "confirmado" && resumen) {
    return (
      <div className="rounded-2xl border border-success-600/30 bg-success-100 p-6 text-center">
        <h2 className="text-base font-semibold text-ink-900">Catálogo reemplazado</h2>
        <p className="mt-1 text-sm text-ink-700">
          {resumen.totalProductos} productos y {resumen.totalVariantes} variantes ya están publicados.
        </p>
        <button
          type="button"
          onClick={nuevaCarga}
          className="mt-4 rounded-full bg-ink-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-ink-700"
        >
          Cargar otro archivo
        </button>
      </div>
    );
  }

  if ((estado === "previsualizando" || estado === "confirmando") && resumen) {
    return (
      <ResumenPrevio
        resumen={resumen}
        diff={diff}
        onConfirmar={confirmar}
        onCancelar={cancelar}
        confirmando={estado === "confirmando"}
        bloqueadoPorOtraOperacion={bloqueadoPorOtraOperacion}
      />
    );
  }

  if (estado === "rechazado" && resumen) {
    return (
      <div className="rounded-2xl border border-danger-600/30 bg-paper-raised p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-danger-100 text-danger-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 9v4m0 4h.01M10.29 3.86l-8.18 14.18A2 2 0 0 0 3.82 21h16.36a2 2 0 0 0 1.71-3l-8.18-14.14a2 2 0 0 0-3.42 0z" />
            </svg>
          </span>
          <div>
            <h2 className="text-base font-semibold text-danger-600">Archivo rechazado</h2>
            <p className="mt-1 text-sm text-ink-700">{resumen.mensaje}</p>
          </div>
        </div>

        {resumen.columnasFaltantes && resumen.columnasFaltantes.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-500">Columnas que faltan</p>
            <div className="flex flex-wrap gap-1.5">
              {resumen.columnasFaltantes.map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-danger-600/30 bg-danger-100 px-2.5 py-1 font-mono text-xs font-medium text-danger-600"
                >
                  {c}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-500">
              Revisá que el encabezado del archivo tenga exactamente estos nombres de columna (misma escritura,
              sin espacios de más) — ver la guía más abajo.
            </p>
          </div>
        )}

        {resumen.errores.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-500">Filas con error</p>
            <TablaErrores errores={resumen.errores} />
          </div>
        )}

        <p className="mt-4 text-xs text-ink-500">El catálogo publicado no fue modificado.</p>

        <button
          type="button"
          onClick={nuevaCarga}
          className="mt-5 rounded-full bg-ink-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-ink-700"
        >
          Intentar con otro archivo
        </button>

        <div className="mt-6 border-t border-ink-200 pt-5">
          <GuiaColumnas />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <GuiaColumnas />

      <div className="rounded-2xl border border-ink-200 bg-paper-raised p-5 sm:p-6">
        <h2 className="text-base font-semibold text-ink-900">Cargar catálogo</h2>

        <div className="mt-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-500">1. Origen de los datos</p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["xlsx", "Archivo Excel"],
                ["csv", "Archivo CSV"],
                ["sheet", "Link de Google Sheets"],
              ] as [OrigenCarga, string][]
            ).map(([valor, etiqueta]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setOrigen(valor)}
                className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                  origen === valor ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-700"
                }`}
              >
                {etiqueta}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-500">2. Archivo</p>
          {origen === "sheet" ? (
            <>
              <label htmlFor="url-sheet" className="mb-1.5 block text-sm font-medium text-ink-900">
                Link publicado como CSV
              </label>
              <input
                id="url-sheet"
                type="url"
                placeholder="https://docs.google.com/spreadsheets/.../pub?output=csv"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm focus:border-accent-600"
              />
              <p className="mt-1.5 text-xs text-ink-500">
                En Google Sheets: Archivo → Compartir → Publicar en la web → formato CSV. Pegá ese link, no el de
                edición normal.
              </p>
            </>
          ) : (
            <>
              <label htmlFor="archivo" className="mb-1.5 block text-sm font-medium text-ink-900">
                Archivo {origen === "xlsx" ? "Excel (.xlsx, .xls o .xlsm)" : "CSV"}
              </label>
              <input
                id="archivo"
                ref={inputArchivoRef}
                type="file"
                accept={origen === "xlsx" ? ".xlsx,.xls,.xlsm" : ".csv"}
                onChange={(e) => setNombreArchivo(e.target.files?.[0]?.name ?? null)}
                className="block w-full text-sm text-ink-700 file:mr-3 file:rounded-full file:border-0 file:bg-ink-100 file:px-3.5 file:py-2 file:text-sm file:font-medium file:text-ink-900 hover:file:bg-ink-200"
              />
              {nombreArchivo && <p className="mt-1.5 text-xs text-ink-500">Seleccionado: {nombreArchivo}</p>}
              <p className="mt-1.5 text-xs text-ink-500">
                Límite: {TAMANO_MAXIMO_BYTES / (1024 * 1024)} MB por archivo — soporta archivos con macros (.xlsm)
                sin problema, siempre que pesen menos que eso.
              </p>
            </>
          )}
        </div>

        <button
          type="button"
          disabled={estado === "procesando"}
          onClick={() => subir(inputArchivoRef.current?.files?.[0] ?? null)}
          className="mt-5 w-full rounded-full bg-ink-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {estado === "procesando" ? "Procesando…" : "Analizar archivo"}
        </button>
      </div>
    </div>
  );
}
