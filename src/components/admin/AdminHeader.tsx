"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import { fetchJson } from "@/lib/apiCliente";
import type { PerfilAdmin } from "@/lib/auth";
import { AdminNav } from "./AdminNav";
import { AvisoModoDemo } from "./AvisoModoDemo";
import { MenuMovilAdmin } from "./MenuMovilAdmin";

// Shell completo del panel: sidebar de escritorio (AdminNav) + barra
// superior + el <main> de cada página, que ahora llega como "children" en
// vez de ser un <main> hermano suelto (ver cada page.tsx/loading.tsx bajo
// app/admin). El nombre del archivo/componente quedó de cuando esto era
// solo la barra superior — se mantiene porque es el único punto de import
// (una decena de páginas) y no hay forma de renombrar sin dejar un archivo
// huérfano de por medio (sin acceso a borrar en el dispositivo conectado).
//
// No existe un layout.tsx de Next por encima de estas páginas (login/
// invitacion viven bajo /admin pero NO deben tener sidebar/topbar, y
// separarlas a un route group implicaría mover archivos — tampoco posible
// sin borrar los originales). Por eso cada página sigue montando este shell
// ella misma: el sidebar guarda su estado colapsado/expandido en
// localStorage (ver AdminNav) para no "olvidarlo" en cada navegación.
export function AdminHeader({ children }: { children: ReactNode }) {
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
    <div className="flex flex-1">
      <AdminNav rol={perfil?.rol ?? null} />

      {/* "min-w-0": sin esto un hijo ancho (ej. una tabla en /admin/catalogo)
          empujaría toda la columna — y con ella el sidebar — más ancha que
          la pantalla, en vez de scrollear puntualmente adentro. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-ink-200 bg-paper-raised">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
              {/* Drawer de mobile/tablet: el sidebar de acá arriba solo se ve
                  desde "lg" (ver AdminNav), por debajo de eso la navegación
                  es este botón + su drawer. */}
              <MenuMovilAdmin rol={perfil?.rol ?? null} />
              {/* El sidebar ya muestra "Panel admin" en su propio encabezado
                  desde "lg" — repetirlo acá también se sentía redundante, así
                  que en desktop esta barra queda sin título, solo con las
                  acciones (cerrar sesión) a la derecha. */}
              <span className="truncate text-base font-semibold tracking-tight text-ink-900 lg:hidden">Panel</span>
              {perfil?.solo_lectura && (
                <span className="shrink-0 rounded-full border border-warning-600/30 bg-warning-100 px-2.5 py-0.5 text-xs font-medium text-warning-600">
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
        </header>
        <AvisoModoDemo />
        {children}
      </div>
    </div>
  );
}
