import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { PanelAdmin } from "@/components/admin/PanelAdmin";
import { HistorialCargas } from "@/components/admin/HistorialCargas";
import { GuiaTallasConfig } from "@/components/admin/GuiaTallasConfig";
import { leerHistorial } from "@/lib/blob";
import { crearClienteServidor } from "@/lib/supabase";
import { obtenerAdminActivo } from "@/lib/auth";

export const metadata = { title: "Catálogo · Panel de administración" };
export const dynamic = "force-dynamic";

export default async function PaginaAdminCatalogo() {
  const supabase = await crearClienteServidor();
  const [historial, perfil] = await Promise.all([leerHistorial(3), obtenerAdminActivo(supabase)]);
  // El editor no puede cargar/confirmar/revertir (la API ya lo rechaza con
  // 403): en vez de dejarle usar el formulario y fallar al final, no se le
  // muestra. La cuenta demo SÍ lo ve (el aviso de modo demo es a propósito).
  const esEditor = perfil?.rol === "editor";

  return (
    <AdminHeader>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {esEditor ? (
          <p className="rounded-xl border border-ink-200 bg-paper-raised p-4 text-sm text-ink-500">
            Tu rol (editor) no puede cargar ni reemplazar el catálogo. Pedíselo a un administrador.
          </p>
        ) : (
          <PanelAdmin />
        )}
        <HistorialCargas entradas={historial} />
        <GuiaTallasConfig />
      </main>
    </AdminHeader>
  );
}
