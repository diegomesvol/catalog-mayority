"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import { ClienteNav, ClienteNavMovil } from "./ClienteNav";

// Shell del portal de cliente — mismo patrón que AdminHeader.tsx (sidebar +
// barra superior + <main> como children). "ClienteHeader" queda como nombre
// aunque ahora es bastante más que un header, por el mismo motivo que
// AdminHeader: es el único punto de import (cliente/page.tsx y
// cliente/perfil/page.tsx) y no hay forma de renombrar el archivo sin
// borrar el original, algo que no se puede hacer en el dispositivo
// conectado. login/invitacion NO importan esto a propósito, así quedan sin
// sidebar — igual que /admin/login y /admin/invitacion.
export function ClienteHeader({ children, perfilCompleto }: { children: ReactNode; perfilCompleto: boolean }) {
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);

  async function salir() {
    setSaliendo(true);
    try {
      await fetch("/api/cliente/logout", { method: "POST" });
      router.push("/cliente/login");
      router.refresh();
    } catch (err) {
      logError("ClienteHeader.salir", err, "No se pudo llegar al servidor para cerrar sesión — revisá tu conexión a internet y probá de nuevo.");
      toast.error("No se pudo cerrar sesión. Probá de nuevo.");
      setSaliendo(false);
    }
  }

  return (
    <div className="flex flex-1">
      <ClienteNav />

      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <header className="flex h-[57px] shrink-0 items-center border-b border-ink-200 bg-paper-raised">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
            <span className="truncate text-base font-semibold tracking-tight text-ink-900 lg:hidden">Mi cuenta</span>
            <div className="hidden lg:block" />
            <button
              type="button"
              onClick={salir}
              disabled={saliendo}
              className="shrink-0 rounded-full px-2.5 py-1 text-sm font-medium text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cerrar sesión
            </button>
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
