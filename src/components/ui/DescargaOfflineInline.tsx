"use client";

import { useDescargaOfflineCatalogo } from "@/hooks/useDescargaOfflineCatalogo";

// Variante de DescargaOffline.tsx para el Drawer mobile (MenuMovilCatalogo):
// mismo hook (única fuente de verdad para qué se descarga/cachea/cancela —
// ver useDescargaOfflineCatalogo), pero SIN el botón+desplegable de acá — el
// Drawer ya es en sí mismo el "click extra" que lo revela, así que la lista
// de marcas se pinta siempre expandida, de entrada, en vez de pedir un
// segundo toque para verla (lo que pedía Diego: sin clics extra).
export function DescargaOfflineInline() {
  const {
    soportado,
    marcas,
    cargandoMarcas,
    descargas,
    generadoEnActual,
    descargando,
    cancelando,
    enProceso,
    marcaDescargando,
    porcentaje,
    descargarMarca,
    cancelarDescarga,
    confirmarEliminarMarca,
  } = useDescargaOfflineCatalogo();

  if (!soportado) return null;

  return (
    <div>
      <p className="mb-2 text-xs text-ink-500">
        Elegí qué marca descargar para verla sin conexión. Podés descargar más de una, de a una por vez.
      </p>

      {cargandoMarcas ? (
        <div className="flex flex-col gap-1.5">
          <div className="skeleton h-11 rounded-lg" />
          <div className="skeleton h-11 rounded-lg" />
        </div>
      ) : marcas && marcas.length > 0 ? (
        <ul className="flex flex-col gap-0.5">
          {marcas.map((marca) => {
            const entrada = descargas[marca];
            const activa = marcaDescargando === marca;
            const desactualizada = Boolean(entrada && generadoEnActual && entrada.generadoEn !== generadoEnActual);
            return (
              <li key={marca} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => descargarMarca(marca)}
                  disabled={enProceso}
                  className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg px-3 py-3 text-left text-sm font-medium text-ink-900 transition-colors hover:bg-ink-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="truncate">{marca}</span>
                  {activa && descargando ? (
                    <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-info-600">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin" aria-hidden="true">
                        <path d="M21 12a9 9 0 1 1-9-9" strokeLinecap="round" />
                      </svg>
                      {porcentaje}%
                    </span>
                  ) : activa && cancelando ? (
                    <span className="shrink-0 text-xs font-medium text-ink-500">Cancelando…</span>
                  ) : desactualizada ? (
                    <span className="shrink-0 text-xs font-medium text-warning-600">Desactualizada</span>
                  ) : entrada ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0 text-success-600">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <span className="shrink-0 text-xs text-ink-500">Descargar</span>
                  )}
                </button>

                {activa && descargando && (
                  <button
                    type="button"
                    onClick={cancelarDescarga}
                    aria-label={`Cancelar descarga de "${marca}"`}
                    title="Cancelar descarga"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-danger-100 hover:text-danger-600"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}

                {entrada && !activa && (
                  <button
                    type="button"
                    onClick={() => confirmarEliminarMarca(marca)}
                    disabled={enProceso}
                    aria-label={`Eliminar "${marca}" descargada`}
                    title="Eliminar descarga"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-danger-100 hover:text-danger-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-2 text-xs text-ink-500">No se pudo cargar el listado de marcas.</p>
      )}
    </div>
  );
}
