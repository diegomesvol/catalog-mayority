// Versión cacheada-por-request de obtenerClienteActivo, SOLO para Server
// Components (RootLayout, Header) — nunca para Route Handlers ni proxy.ts,
// que necesitan su PROPIO cliente de Supabase con permiso de escribir
// cookies (ver crearClienteServidor/crearClienteProxy en lib/supabase.ts).
//
// Motivo: antes RootLayout y Header creaban CADA UNO su propio cliente y
// llamaban a obtenerClienteActivo por separado — dos consultas de sesión
// independientes en el mismo request. Cuando el access token estaba
// vencido, las dos disparaban su propio refresh EN PARALELO usando el mismo
// refresh token (de un solo uso): la primera lo consumía sin poder guardar
// la rotación (un Server Component no puede escribir cookies), la segunda
// llegaba con el token ya usado y fallaba — resultados inconsistentes entre
// componentes del mismo request, y la sesión quedaba dañada en el
// navegador. Ver la nota grande en proxy.ts para la otra mitad de esta
// causa raíz (el catálogo público no pasaba por el proxy, así que nadie
// podía persistir ningún refresh ahí).
//
// `cache()` de React memoiza por request de render: sin importar cuántos
// Server Components llamen a esto, crearClienteServidor + getUser() +
// la consulta a `clientes` corren UNA sola vez por request.
import { cache } from "react";
import { crearClienteServidor } from "./supabase";
import { obtenerClienteActivo, type PerfilCliente } from "./clienteAuth";

export const obtenerClienteActivoCacheado = cache(async (): Promise<PerfilCliente | null> => {
  const supabase = await crearClienteServidor();
  return obtenerClienteActivo(supabase);
});
