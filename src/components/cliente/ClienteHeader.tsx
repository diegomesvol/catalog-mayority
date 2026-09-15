"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ClienteNav, ClienteNavMovil } from "./ClienteNav";

// Shell del portal de cliente — mismo patrón que AdminHeader.tsx (sidebar +
// barra superior + <main> como children). "ClienteHeader" queda como nombre
// aunque ahora es bastante más que un header, por el mismo motivo que
// AdminHeader: es el único punto de import (cliente/page.tsx y
// cliente/perfil/page.tsx) y no hay forma de renombrar el archivo sin
// borrar el original, algo que no se puede hacer en el dispositivo
// conectado. login/invitacion NO importan esto a propósito, así quedan sin
// sidebar — igual que /admin/login y /admin/invitacion.
//
// "Cerrar sesión" vivía acá (barra superior) — se movió al pie de ClienteNav
// / ClienteNavMovil (mismo pedido que en el panel admin: unificar el cierre
// de sesión en la navegación, no en la topbar). Sin esa acción, la barra de
// acá ya no tiene nada que mostrar en desktop (ClienteNav ya repite "Mi
// cuenta" en su propio encabezado) — queda lg:hidden, solo el título mobile.
export function ClienteHeader({ children, perfilCompleto }: { children: ReactNode; perfilCompleto: boolean }) {
  return (
    <div className="flex flex-1">
      <ClienteNav />

      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <header className="flex h-[57px] shrink-0 items-center border-b border-ink-200 bg-paper-raised lg:hidden">
          <div className="mx-auto flex w-full max-w-3xl items-center px-4 sm:px-6">
            <span className="truncate text-base font-semibold tracking-tight text-ink-900">Mi cuenta</span>
          </div>
        </header>
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
