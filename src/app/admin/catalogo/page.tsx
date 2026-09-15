import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { PanelAdmin } from "@/components/admin/PanelAdmin";
import { HistorialCargas } from "@/components/admin/HistorialCargas";
import { GuiaTallasConfig } from "@/components/admin/GuiaTallasConfig";
import { leerHistorial } from "@/lib/blob";

export const metadata = { title: "Catálogo · Panel de administración" };
export const dynamic = "force-dynamic";

export default async function PaginaAdminCatalogo() {
  const historial = await leerHistorial(3);

  return (
    <AdminHeader>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <PanelAdmin />
        <HistorialCargas entradas={historial} />
        <GuiaTallasConfig />
      </main>
    </AdminHeader>
  );
}
