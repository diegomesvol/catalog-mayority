// Fetch + parseo de JSON para las llamadas del panel admin a su propia API
// interna — el paso que se repetía igual en cada componente (fetch, luego
// resp.json() con manejo de que la respuesta no sea JSON válido, ej. un 413
// cortado antes de llegar al route handler). Cada componente sigue
// decidiendo cómo reaccionar a resp.ok/data.ok (los mensajes y qué loguear
// varían a propósito entre carga inicial y guardado) — esto solo evita
// repetir el fetch + parseo en cada uno.
//
// No reemplaza flujos donde la respuesta exitosa NO es JSON (ej.
// DescargarArchivoOriginal, que en éxito recibe el archivo como blob) — ahí
// sigue usándose fetch directo a propósito.
//
// Aviso de modo demo: requierePermisoEscritura (lib/auth.ts) marca con
// `demo: true` cualquier respuesta 403 bloqueada por solo_lectura. En vez de
// que cada componente que usa fetchJson tenga que revisar ese flag a mano,
// se avisa acá mismo (un único punto de entrada) a quien se haya
// registrado con registrarAvisoDemo — hoy es AvisoModoDemo.tsx, montado una
// sola vez en AdminHeader. El componente igual sigue viendo la respuesta
// normal (resp/data) y puede mostrar su toast de siempre; el modal es un
// aviso aparte, más visible, pensado específicamente para este caso.
type ManejadorAvisoDemo = () => void;
let manejadorAvisoDemo: ManejadorAvisoDemo | null = null;

export function registrarAvisoDemo(manejador: ManejadorAvisoDemo | null) {
  manejadorAvisoDemo = manejador;
}

export async function fetchJson<T>(input: string, init?: RequestInit): Promise<{ resp: Response; data: T | null }> {
  const resp = await fetch(input, init);
  const data = (await resp.json().catch(() => null)) as T | null;
  if (resp.status === 403 && data && typeof data === "object" && "demo" in data && data.demo) {
    manejadorAvisoDemo?.();
  }
  return { resp, data };
}
