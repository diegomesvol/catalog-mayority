// Fetcher para useSWR — deliberadamente DISTINTO de fetchJson (lib/
// apiCliente.ts): SWR espera un fetcher que devuelva los datos directo (o
// rechace la promesa), no el wrapper {resp, data} — así su manejo propio de
// error/reintento/dedupe funciona sin que cada componente tenga que revisar
// resp.ok a mano. Solo para GETs de lectura (config, listas) cacheables; las
// escrituras (POST/PATCH) siguen usando fetchJson como hasta ahora.
export async function fetcherJson<T>(url: string): Promise<T> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Error ${resp.status} al pedir ${url}`);
  return (await resp.json()) as T;
}
