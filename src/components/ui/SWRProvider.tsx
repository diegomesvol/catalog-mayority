"use client";

import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { proveedorCacheLocal } from "@/lib/swrCacheLocal";

// Montado una sola vez en app/layout.tsx, envolviendo toda la app — mismo
// criterio que NavegacionOverlay. Todo useSWR() de acá abajo (catálogo,
// portal de cliente, admin) comparte una única cache respaldada en
// localStorage (ver swrCacheLocal.ts) y, para una misma key (ej.
// "/api/admin/config"), un único fetch real aunque varios componentes lo
// pidan en el mismo render (ClienteHeader y AdminHeader ya no duplican la
// llamada a /api/admin/config entre sí).
export function SWRProvider({ children }: { children: ReactNode }) {
  return <SWRConfig value={{ provider: proveedorCacheLocal }}>{children}</SWRConfig>;
}
