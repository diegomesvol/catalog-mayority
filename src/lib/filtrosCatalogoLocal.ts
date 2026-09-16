import type { ValorFiltros } from "@/components/catalogo/Filtros";

// Persistencia en localStorage de los filtros/orden del catálogo público —
// mismo criterio try/catch que swrCacheLocal.ts, no rompe nada si
// localStorage no está disponible (modo privado, cuota, etc.). La URL sigue
// siendo la fuente de verdad para un link COMPARTIDO (gana siempre que
// traiga algún filtro u orden, ver CatalogoClient.tsx); esto es solo para
// que, dentro del mismo navegador, la última búsqueda quede guardada entre
// visitas sin depender de la URL.
//
// No aplica si "/" muestra el landing de colecciones en vez de la grilla
// (page.tsx decide eso del lado del servidor, antes de que exista
// localStorage) — un comprador que vuelve a "/" sin ningún query param ve
// el landing igual que siempre; los filtros guardados solo se restauran una
// vez que la grilla (CatalogoClient) llega a montarse.
const CLAVE = "catalogo-filtros-v1";

export function leerFiltrosGuardados(): ValorFiltros | null {
  if (typeof window === "undefined") return null;
  try {
    const guardado = window.localStorage.getItem(CLAVE);
    return guardado ? (JSON.parse(guardado) as ValorFiltros) : null;
  } catch {
    return null;
  }
}

export function guardarFiltros(filtros: ValorFiltros): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(filtros));
  } catch {
    // Cuota llena u otro error de localStorage — se pierde la persistencia
    // de esta sesión, el catálogo sigue funcionando igual (arranca vacío la
    // próxima vez).
  }
}
