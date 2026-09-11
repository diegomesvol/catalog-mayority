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
export async function fetchJson<T>(input: string, init?: RequestInit): Promise<{ resp: Response; data: T | null }> {
  const resp = await fetch(input, init);
  const data = (await resp.json().catch(() => null)) as T | null;
  return { resp, data };
}
