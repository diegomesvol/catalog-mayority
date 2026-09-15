import Link from "next/link";
import type { ConfigSitio, LogoFooter } from "@/lib/types";

// Texto por defecto — se muestra mientras el admin no configure nada
// distinto desde /admin/configuracion (ConfigSitio en Vercel Blob), y
// también en las pantallas que no pueden leer esa config (ver "config" más
// abajo): error.tsx es un Client Component (no puede hacer fetch a Blob), y
// los loading.tsx/not-found.tsx son vistas de paso donde no vale la pena
// pagar esa lectura extra — solo lo hacen las páginas de contenido real.
const DESCRIPCION_DEFECTO =
  "Fábrica de calzado venezolana con más de 70 años de trayectoria, negocio familiar de tres generaciones. Capacidad instalada de 192.000 pares al mes.";
const RIF_DEFECTO = "J-30242134-9";
const RAZON_SOCIAL_DEFECTO = "Calzados Mesvol, C.A.";

interface Props {
  config?: Pick<ConfigSitio, "descripcionEmpresa" | "rif" | "razonSocial"> | null;
  logosFooter?: LogoFooter[];
}

export function Footer({ config, logosFooter = [] }: Props = {}) {
  const descripcion = config?.descripcionEmpresa?.trim() || DESCRIPCION_DEFECTO;
  const rif = config?.rif?.trim() || RIF_DEFECTO;
  const razonSocial = config?.razonSocial?.trim() || RAZON_SOCIAL_DEFECTO;
  const anio = new Date().getFullYear();
  // Solo los que el admin dejó visibles Y tienen imagen cargada — un logo
  // "oculto" (ver LogosFooterConfig) nunca llega a pintarse acá, aunque el
  // archivo siga guardado en Storage.
  const marcasVisibles = logosFooter.filter((logo) => logo.visible && logo.imagenUrl);

  return (
    <footer className="mt-12 border-t border-ink-200 bg-paper-raised">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
        <div>
          {/* El logo se movió al Header (al lado del título "Catálogo
              Mayorista"/tituloPlataforma) — acá antes se repetía. */}
          <h2 className="text-sm font-semibold text-ink-900">{razonSocial}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">{descripcion}</p>
        </div>

        {marcasVisibles.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-ink-900">Nuestras marcas</h2>
            {/* flex-wrap + max-w/max-h por logo (en vez de un ancho/alto
                fijo por imagen como antes, que venía de un array estático):
                ahora son URLs de Supabase Storage subidas por el admin, de
                proporción variable — con 1, 2, 3 o 4 logos activos el bloque
                se acomoda solo sin romperse ni superponerse, cada uno
                recortado a la misma altura máxima para que se vean parejos. */}
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
              {marcasVisibles.map((marca) => (
                // eslint-disable-next-line @next/next/no-img-element -- URL de Supabase Storage subida por el admin, no un dominio fijo conocido de antemano
                <img
                  key={marca.id}
                  src={marca.imagenUrl!}
                  alt={marca.nombre}
                  className="h-7 w-auto max-w-[140px] object-contain sm:h-8"
                />
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-sm font-semibold text-ink-900">Contacto</h2>
          <p className="mt-2 text-sm text-ink-500">{razonSocial}</p>
          <p className="text-sm text-ink-500">RIF {rif}</p>
        </div>
      </div>

      <div className="border-t border-ink-200">
        <div className="mx-auto flex max-w-6xl flex-col-reverse items-center justify-between gap-2 px-4 py-4 text-xs text-ink-500 sm:flex-row sm:px-6">
          <span>© {anio} {razonSocial}. Todos los derechos reservados.</span>
          <Link href="/admin" className="underline-offset-2 hover:text-ink-900 hover:underline">
            Acceso administrador
          </Link>
        </div>
      </div>
    </footer>
  );
}
