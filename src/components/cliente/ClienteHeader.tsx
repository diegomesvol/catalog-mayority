"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { fetchJson } from "@/lib/apiCliente";
import type { ConfigSitio } from "@/lib/types";
import { ClienteNav, ClienteNavMovil } from "./ClienteNav";

interface ClienteSesion {
  nombre: string;
  email: string;
  avatarUrl: string | null;
}

interface Props {
  children: ReactNode;
  perfilCompleto: boolean;
  // Identidad de la sesión — cada page.tsx ya resuelve
  // obtenerClienteActivo/obtenerClienteActivoCacheado de todas formas, así
  // que se la pasa directo, sin fetch aparte acá. Alimenta el bloque de
  // avatar/nombre del pie del sidebar (ver ClienteNav). null es defensivo
  // (mismo criterio que perfilCompleto ?? true en cada page.tsx) — no
  // debería darse con un cliente realmente logueado.
  cliente?: ClienteSesion | null;
  // false: el catálogo/producto ya traen su propia barra superior completa
  // (Header.tsx, con logo/búsqueda/carrito en todos los breakpoints) — ahí
  // ClienteHeader solo aporta el sidebar + el nav mobile, sin repetir una
  // segunda barra de título encima. true (default): páginas de Mi Cuenta,
  // que no tienen una barra propia.
  mostrarBarraTitulo?: boolean;
}

// Shell del portal de cliente — mismo patrón que AdminHeader.tsx (sidebar +
// barra superior + <main> como children). Ahora envuelve TANTO "Mi cuenta"
// (cliente/page.tsx, cliente/perfil/page.tsx, cliente/pedidos/[id]/page.tsx)
// COMO el catálogo público y el detalle de producto CUANDO hay sesión de
// cliente activa (ver app/page.tsx y app/producto/[id]/page.tsx) — mismo
// sidebar en los dos casos, para que no haya salto de navegación entre
// áreas. Sin sesión, catálogo/producto siguen exactamente como antes (solo
// Header.tsx, sin este shell) — ver el chequeo `if (!clienteActivo)` en esas
// dos pages.
//
// "ClienteHeader" queda como nombre aunque ya es bastante más que un header,
// por el mismo motivo que AdminHeader: es el único punto de import y no hay
// forma de renombrar el archivo sin borrar el original (no se puede en el
// dispositivo conectado). login/invitacion NO importan esto a propósito, así
// quedan sin sidebar — igual que /admin/login y /admin/invitacion.
//
// "Cerrar sesión" vivía acá (barra superior) — se movió al pie de ClienteNav
// / ClienteNavMovil (mismo pedido que en el panel admin: unificar el cierre
// de sesión en la navegación, no en la topbar).
export function ClienteHeader({ children, perfilCompleto, cliente = null, mostrarBarraTitulo = true }: Props) {
  // Logo de marca — mismo dato que usa Header.tsx del catálogo público
  // (config.logoVisible/config.logoUrl), pedido acá client-side porque
  // ClienteHeader es un Client Component sin acceso directo a
  // leerConfigSitio(); mismo patrón que AdminHeader.tsx usa para su título
  // dinámico. /api/admin/config GET no requiere sesión (ver esa nota en
  // AdminHeader.tsx). Sirve de ancla visual para que la marca no desaparezca
  // al cruzar del catálogo (topbar, cuando no hay sesión) a acá (sidebar).
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  useEffect(() => {
    fetchJson<{ ok: boolean; config?: ConfigSitio }>("/api/admin/config").then(({ data }) => {
      if (data?.ok && data.config?.logoVisible && data.config.logoUrl) setLogoUrl(data.config.logoUrl);
    });
  }, []);

  return (
    <div className="flex flex-1">
      <ClienteNav logoUrl={logoUrl} cliente={cliente} />

      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        {mostrarBarraTitulo && (
          <header className="flex h-[57px] shrink-0 items-center border-b border-ink-200 bg-paper-raised lg:hidden">
            <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 sm:px-6">
              {logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- URL de Supabase Storage, no un dominio fijo conocido de antemano
                <img src={logoUrl} alt="" className="h-6 w-6 shrink-0 rounded object-contain" />
              )}
              <span className="truncate text-base font-semibold tracking-tight text-ink-900">Mi cuenta</span>
            </div>
          </header>
        )}
        <ClienteNavMovil />

        {!perfilCompleto && (
          <div className="border-b border-warning-600/30 bg-warning-100 px-4 py-2.5 sm:px-6">
            <p className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-x-2 gap-y-1 text-xs text-warning-600">
              <span className="font-medium">Tu perfil está incompleto.</span>
              <span>Completalo para poder realizar pedidos.</span>
              <Link href="/cliente/perfil" className="font-medium underline underline-offset-2 hover:no-underline">
                Completar perfil
              </Link>
            </p>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
