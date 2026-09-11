"use client";

import { useDescargaOfflineCatalogo } from "@/hooks/useDescargaOfflineCatalogo";

// Botón de descarga offline — la lógica completa (qué se descarga, cómo se
// cachea, cómo se cancela/elimina) vive en useDescargaOfflineCatalogo; este
// componente solo renderiza el botón y el desplegable de marcas.
export function DescargaOffline() {
  const {
    soportado,
    abierto,
    alternarAbierto,
    marcas,
    cargandoMarcas,
    descargas,
    generadoEnActual,
    estado,
    descargando,
    cancelando,
    enProceso,
    marcaDescargando,
    porcentaje,
    hayAlgunaDescarga,
    hayDesactualizada,
    descargarMarca,
    cancelarDescarga,
    confirmarEliminarMarca,
  } = useDescargaOfflineCatalogo();

  if (!soportado) return null;

  return (
    <div className="relative flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        onClick={alternarAbierto}
        disabled={enProceso}
        aria-expanded={abierto}
        aria-label={
          descargando
            ? `Descargando "${marcaDescargando}" — ${porcentaje}%`
            : cancelando
              ? `Cancelando descarga de "${marcaDescargando}"`
              : hayAlgunaDescarga
                ? "Catálogo descargado — elegir marca para descargar"
                : "Descargar catálogo para verlo sin conexión"
        }
        title={hayDesactualizada ? "El catálogo cambió desde tu última descarga — volvé a descargar" : undefined}
        className={`relative flex shrink-0 items-center gap-1.5 overflow-hidden rounded-full border px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-wait ${
          descargando
            ? // Mismo tratamiento "suave" (fondo pastel + texto/borde del
              // color, sin relleno sólido) que el estado "Descargado" de acá
              // abajo — un azul sólido a pleno color desentonaba con el
              // resto de la paleta, que es prácticamente toda neutra.
              "border-info-600 bg-info-100 text-info-600"
            : cancelando
              ? "border-ink-300 bg-ink-100 text-ink-500"
              : hayAlgunaDescarga
                ? "border-success-600 bg-success-100 text-success-600"
                : "border-ink-200 text-ink-900 hover:border-ink-900"
        }`}
      >
        {descargando && (
          <span
            className="absolute inset-y-0 left-0 bg-info-600/15 transition-[width] duration-200"
            style={{ width: `${porcentaje}%` }}
            aria-hidden="true"
          />
        )}
        <span className="relative flex items-center gap-1.5">
          {descargando ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-9-9" strokeLinecap="round" />
            </svg>
          ) : hayAlgunaDescarga ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
              <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          <span className="hidden sm:inline">
            {descargando
              ? `Descargando ${porcentaje}%`
              : cancelando
                ? "Cancelando…"
                : hayAlgunaDescarga
                  ? "Descargado"
                  : "Descargar"}
          </span>
          {hayDesactualizada && !enProceso && (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning-600" aria-hidden="true" />
          )}
        </span>
      </button>

      {descargando && (
        <button
          type="button"
          onClick={cancelarDescarga}
          aria-label="Cancelar descarga"
          title="Cancelar descarga"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink-200 text-ink-500 transition-colors hover:border-danger-600 hover:bg-danger-100 hover:text-danger-600"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      {abierto && (
        <div className="absolute right-0 top-full z-30 mt-2 w-64 rounded-xl border border-ink-200 bg-paper-raised p-2 shadow-lg">
          <p className="px-2 pb-2 pt-1 text-xs text-ink-500">
            Elegí qué marca descargar para verla sin conexión. Podés descargar más de una, de a una por vez.
          </p>
          {cargandoMarcas ? (
            <div className="space-y-1.5 px-2 pb-2">
              <div className="skeleton h-8 rounded-lg" />
              <div className="skeleton h-8 rounded-lg" />
            </div>
          ) : marcas && marcas.length > 0 ? (
            <ul className="flex flex-col gap-0.5">
              {marcas.map((marca) => {
                const entrada = descargas[marca];
                const desactualizada = Boolean(entrada && generadoEnActual && entrada.generadoEn !== generadoEnActual);
                return (
                  <li key={marca} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => descargarMarca(marca)}
                      disabled={enProceso}
                      className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm text-ink-900 transition-colors hover:bg-ink-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span>{marca}</span>
                      {estado.fase === "descargando" && estado.marca === marca ? (
                        <span className="text-[11px] font-medium text-ink-500">{porcentaje}%</span>
                      ) : desactualizada ? (
                        <span className="text-[11px] font-medium text-warning-600">Desactualizada</span>
                      ) : entrada ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0 text-ink-500">
                          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <span className="text-[11px] text-ink-500">Descargar</span>
                      )}
                    </button>
                    {entrada && (
                      <button
                        type="button"
                        onClick={() => confirmarEliminarMarca(marca)}
                        disabled={enProceso}
                        aria-label={`Eliminar "${marca}" descargada`}
                        title="Eliminar descarga"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-danger-100 hover:text-danger-600 disabled:cursor-not-allowed disabled:opacity-50"
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
            <p className="px-2 py-2 text-xs text-ink-500">No se pudo cargar el listado de marcas.</p>
          )}
        </div>
      )}
    </div>
  );
}
