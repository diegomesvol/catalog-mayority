import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ConfiguracionForm } from "@/components/admin/ConfiguracionForm";
import { LogosFooterConfig } from "@/components/admin/LogosFooterConfig";
import { PerfilSeguridadAdmin } from "@/components/admin/PerfilSeguridadAdmin";
import { leerLogosFooter } from "@/lib/blob";

export const metadata = { title: "Configuración · Panel de administración" };
// Mismo motivo que las otras dos pestañas del panel: sin esto, Next intenta
// prerenderizar esta página en el build (usePathname de AdminNav no tiene
// contexto de request en ese momento) y termina resolviendo todo del lado
// del cliente en vez de servir HTML ya armado — funciona igual para quien
// navega, pero es innecesario dado que esta pantalla siempre está detrás
// del login y no gana nada con quedar estática.
export const dynamic = "force-dynamic";

export default async function PaginaAdminConfiguracion() {
  const logosFooter = await leerLogosFooter();

  return (
    <AdminHeader>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <ConfiguracionForm />
        <div className="mt-6">
          <LogosFooterConfig logosIniciales={logosFooter} />
        </div>
        <PerfilSeguridadAdmin />
        <p className="mt-6 text-center text-xs text-ink-500">
          <Link href="/" className="underline-offset-2 hover:underline">
            Ver catálogo público
          </Link>
        </p>
      </main>
    </AdminHeader>
  );
}
