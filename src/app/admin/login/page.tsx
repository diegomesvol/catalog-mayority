import { Suspense } from "react";
import { leerConfigSitio } from "@/lib/blob";
import { LoginAdminForm } from "@/components/admin/LoginAdminForm";

export const metadata = { title: "Ingresar · Panel de administración" };
export const dynamic = "force-dynamic";

// Fondo configurable desde /admin/configuracion (ConfiguracionForm) — Server
// Component (puede leer leerConfigSitio directo) que solo arma el fondo;
// el formulario en sí (estado, submit, Google) vive en LoginAdminForm, un
// Client Component aparte envuelto en Suspense porque usa useSearchParams
// (?error=… del callback de OAuth) — mismo motivo que BusquedaProvider en
// el layout raíz.
export default async function PaginaLoginAdmin() {
  const { fondoLoginUrl } = await leerConfigSitio();

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-900 px-4 py-10 lg:justify-end lg:px-16">
      <div className="absolute inset-0" aria-hidden="true">
        {fondoLoginUrl && (
          // <img> normal, no next/image: el admin puede pegar una URL
          // externa de cualquier dominio (colecciones/guía de tallas usan
          // el mismo storage, pero ESTE campo además acepta un link
          // externo) y next/image exige que el dominio esté en
          // remotePatterns (next.config.ts) — con una <img> lisa no aplica
          // esa restricción, igual que ImagenProducto en su modo "natural".
          // eslint-disable-next-line @next/next/no-img-element -- intencional: la URL puede ser externa y de cualquier dominio (ver comentario arriba)
          <img src={fondoLoginUrl} alt="" className="h-full w-full object-cover" />
        )}
        {/* Degradé encima de la imagen (o solo el degradé, si no hay imagen
            configurada — bg-ink-900 del <main> ya cubre ese caso) — oscurece
            lo suficiente para que la card flotante y cualquier texto tengan
            contraste garantizado sin importar qué tan clara sea la foto que
            suba el admin. */}
        <div className="absolute inset-0 bg-gradient-to-br from-ink-900/80 via-ink-900/45 to-ink-900/75" />
      </div>

      <Suspense fallback={null}>
        <LoginAdminForm />
      </Suspense>
    </main>
  );
}
