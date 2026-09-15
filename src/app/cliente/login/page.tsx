import { Suspense } from "react";
import { leerConfigSitio } from "@/lib/blob";
import { LoginClienteForm } from "@/components/cliente/LoginClienteForm";

export const metadata = { title: "Ingresar · Mi cuenta" };
export const dynamic = "force-dynamic";

// Mismo wrapper visual que /admin/login/page.tsx (mismo fondo configurable,
// mismo degradé) — portal unificado en el look. LoginClienteForm ahora lee
// ?error=sin_acceso (ver proxy.ts) vía useSearchParams, así que necesita el
// mismo boundary de Suspense que el de admin.
export default async function PaginaLoginCliente() {
  const { fondoLoginUrl, logoUrl, logoVisible, razonSocial } = await leerConfigSitio();

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-900 px-4 py-10 lg:justify-end lg:px-16">
      <div className="absolute inset-0" aria-hidden="true">
        {fondoLoginUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- misma razón que /admin/login/page.tsx: la URL puede ser externa y de cualquier dominio
          <img src={fondoLoginUrl} alt="" className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-ink-900/80 via-ink-900/45 to-ink-900/75" />
      </div>

      <div className="relative flex w-full max-w-sm flex-col items-center lg:items-end">
        {logoVisible && logoUrl && (
          // Mismo tratamiento que /admin/login/page.tsx — ver la nota ahí.
          // eslint-disable-next-line @next/next/no-img-element -- URL de Supabase Storage o externa, mismo motivo que fondoLoginUrl arriba
          <img
            src={logoUrl}
            alt={razonSocial}
            className="mb-6 h-14 w-auto max-w-[200px] rounded-2xl bg-white/10 p-2.5 object-contain shadow-lg backdrop-blur-sm sm:h-16"
          />
        )}
        <Suspense fallback={null}>
          <LoginClienteForm />
        </Suspense>
      </div>
    </main>
  );
}
