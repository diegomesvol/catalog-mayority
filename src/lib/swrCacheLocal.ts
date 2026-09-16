import type { Cache } from "swr";

// Cache de SWR respaldado en localStorage — patrón documentado por la propia
// SWR (swr.vercel.app/docs/advanced/cache#localstorage-based-persistent-cache).
// Sin esto, SWR igual dedupea/revalida en memoria, pero arranca vacío en
// cada carga de página: la primera vez que aparece el título de la
// plataforma o el logo, siempre hay que esperar el fetch. Con esto, apenas
// se monta la app ya hay datos (los de la última visita) para pintar al
// instante, mientras la revalidación real pasa en segundo plano — es
// literalmente el "renderice datos estáticos/en caché al instante mientras
// las consultas dinámicas terminan" que se pidió.
//
// Es una Map en memoria normal (Map ya cumple la interfaz Cache de SWR:
// get/set/delete/keys) que se hidrata una vez desde localStorage al crearse
// y se vuelve a guardar en localStorage antes de que la pestaña se cierre —
// no en cada set() (eso sería un write a disco por cada revalidación).
const CLAVE = "swr-cache-v1";

export function proveedorCacheLocal(): Cache {
  const mapa = new Map<string, unknown>();

  if (typeof window !== "undefined") {
    try {
      const guardado = window.localStorage.getItem(CLAVE);
      if (guardado) {
        const entradas = JSON.parse(guardado) as [string, unknown][];
        for (const [llave, valor] of entradas) mapa.set(llave, valor);
      }
    } catch {
      // localStorage no disponible (modo privado, cuota, etc.) o el JSON
      // guardado está corrupto — arranca en memoria, sin cache previa; no
      // es un error que deba interrumpir nada.
    }

    window.addEventListener("beforeunload", () => {
      try {
        window.localStorage.setItem(CLAVE, JSON.stringify(Array.from(mapa.entries())));
      } catch {
        // Cuota llena u otro error de localStorage — se pierde la
        // persistencia de esta sesión de pestaña, la app sigue funcionando
        // igual (vuelve a fetchear como si no hubiera cache).
      }
    });
  }

  return mapa as unknown as Cache;
}
