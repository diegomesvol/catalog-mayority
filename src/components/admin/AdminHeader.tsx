"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import { fetchJson } from "@/lib/apiCliente";
import type { PerfilAdmin } from "@/lib/auth";
import { AdminNav } from "./AdminNav";
import { AvisoModoDemo } from "./AvisoModoDemo";

export function AdminHeader() {
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);
  const [perfil, setPerfil] = useState<PerfilAdmin | null>(null);

  // Solo para el badge de "modo demostración" — el bloqueo real ya lo hace
  // el servidor en cada ruta de escritura (requierePermisoEscritura); esto
  // es puramente informativo, no una barrera de seguridad.
  useEffect(() => {
    fetchJson<{ ok: boolean; perfil?: PerfilAdmin }>("/api/admin/me").then(({ data }) => {
      if (data?.ok && data.perfil) setPerfil(data.perfil);
    });
  }, []);

  async function salir() {
    setSaliendo(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } catch (err) {
      logError("AdminHeader.salir", err, "No se pudo llegar al servidor para cerrar sesión — revisá tu conexión a internet y probá de nuevo.");
      toast.error("No se pudo cerrar sesión. Probá de nuevo.");
      setSaliendo(false);
    }
  }

  return (
    <header className="border-b border-ink-200 bg-paper-raised">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold tracking-tight text-ink-900">Panel de administración</span>
          {perfil?.solo_lectura && (
            <span className="rounded-full border border-warning-600/30 bg-warning-100 px-2.5 py-0.5 text-xs font-medium text-warning-600">
              Modo demostración
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={salir}
          disabled={saliendo}
          className="shrink-0 text-sm font-medium text-ink-500 hover:text-ink-900 disabled:opacity-50"
        >
          Cerrar sesión
        </button>
      </div>
      <AdminNav />
      <AvisoModoDemo />
    </header>
  );
}
