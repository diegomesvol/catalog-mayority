import Link from "next/link";
import { CarritoBoton } from "@/components/carrito/CarritoBoton";
import { BuscadorNavbar } from "./BuscadorNavbar";
import { DescargaOffline } from "./DescargaOffline";
import { crearClienteServidor } from "@/lib/supabase";
import { obtenerClienteActivo } from "@/lib/clienteAuth";
import { leerConfigSitio } from "@/lib/blob";

const TITULO_DEFECTO = "Catálogo Mayorista";

// Async: resuelve la sesión de cliente acá mismo (en vez de que cada página
// que renderiza <Header /> se la pase por prop) — mismo dato que ya calcula
// RootLayout para CarritoProvider, pero Header no vive en el layout, vive en
// cada page.tsx del catálogo público (ver app/page.tsx y
// app/producto/[id]/page.tsx), así que se resuelve acá para no tocar esos
// archivos. Mismo criterio para el logo/título: antes el logo vivía en
// Footer.tsx (recibido por prop desde cada page.tsx) — ahora se movió acá,
// al lado del título, así que Header lee su propia config directamente
// (leerConfigSitio está cache()-eado, así que no duplica la lectura que
// cada page.tsx ya hace para el Footer).
export async function Header() {
  const [clienteActivo, config] = await Promise.all([
    crearClienteServidor().then((supabase) => obtenerClienteActivo(supabase)),
    leerConfigSitio(),
  ]);
  const titulo = config.tituloPlataforma?.trim() || TITULO_DEFECTO;
  const mostrarLogo = Boolean(config.logoVisible && config.logoUrl);

  return (
    <header className="sticky top-0 z-20 border-b border-ink-200 bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/70">
      {/* En mobile (base) el logo+título y las acciones van en columnas
          "auto": cada una ocupa exactamente el ancho de su contenido y nunca
          se comprime por debajo de eso, así que nunca terminan solapadas —
          el buscador es la única columna flexible (minmax(0,1fr)) y es la
          que cede ancho cuando el espacio escasea (ej. el botón de descarga
          mostrando además el de cancelar mientras descarga, o el badge del
          carrito). Antes las 3 columnas eran fraccionales con un piso fijo
          en la del medio: el piso "protegía" al buscador pero no a sus
          vecinas — sus botones (shrink-0) no se achicaban y su contenido
          terminaba pintándose encima del buscador en vez de simplemente
          recortarse. Desde `sm` ya hay ancho de sobra para el patrón
          simétrico (fr/fr/fr con piso en la columna central), que centra el
          buscador de verdad (equidistante de los dos bordes) en vez de "lo
          que sobre después del logo". */}
      <div className="mx-auto grid max-w-6xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(140px,280px)_minmax(0,1fr)] sm:gap-3 sm:px-6">
        {/* Logo (si está configurado y visible — ver ConfiguracionForm,
            antes vivía en Footer.tsx) + título dinámico, uno al lado del
            otro. "truncate" en el título: un título largo tipeado por el
            admin se recorta en vez de romper la fila en mobile; el logo
            nunca se achica (shrink-0) para no verse deformado. */}
        {/* max-w-[45vw]: la columna es "auto" (se ajusta a su contenido) en
            mobile, así que sin un tope el título más largo que el admin
            tipee (hasta TITULO_PLATAFORMA_MAX) empujaría la columna del
            buscador en vez de recortarse — con el tope, "truncate" sí tiene
            un ancho contra el cual cortar. */}
        <div className="min-w-0 max-w-[45vw] justify-self-start sm:max-w-none">
          <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2">
            {mostrarLogo && (
              // eslint-disable-next-line @next/next/no-img-element -- URL de Supabase Storage, no un dominio fijo conocido de antemano
              <img src={config.logoUrl!} alt="" className="h-6 w-auto shrink-0 object-contain sm:h-8" />
            )}
            <span className="truncate text-base font-semibold tracking-tight text-ink-900">{titulo}</span>
          </Link>
        </div>
        <BuscadorNavbar />
        <div className="flex min-w-0 items-center justify-self-end gap-1 sm:gap-2">
          <DescargaOffline />
          {/* Visible en cualquier parte del scroll (header sticky) — mismo
              criterio que BuscadorNavbar/CarritoBoton. Va a /cliente si ya
              hay sesión (portal), a /cliente/login si no. */}
          <Link
            href={clienteActivo ? "/cliente" : "/cliente/login"}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-ink-200 px-2.5 py-2 text-sm font-medium text-ink-900 transition-colors hover:border-ink-900 sm:px-3.5"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span className="hidden sm:inline">{clienteActivo ? "Mi cuenta" : "Ingresar"}</span>
          </Link>
          <CarritoBoton />
        </div>
      </div>
    </header>
  );
}
