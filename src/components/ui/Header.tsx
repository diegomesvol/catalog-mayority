import Link from "next/link";
import { CarritoBoton } from "@/components/carrito/CarritoBoton";
import { BuscadorNavbar } from "./BuscadorNavbar";
import { CuentaClienteMenu } from "./CuentaClienteMenu";
import { DescargaOffline } from "./DescargaOffline";
import { MenuMovilCatalogo } from "./MenuMovilCatalogo";
import { obtenerClienteActivoCacheado } from "@/lib/sesionCliente";
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
  // obtenerClienteActivoCacheado (no obtenerClienteActivo + un cliente
  // propio): cacheada por request, así no compite por el refresh token con
  // la misma consulta que hace RootLayout en este mismo request — ver la
  // nota grande en lib/sesionCliente.ts (causa raíz del bug de sesión que
  // mandaba a un cliente logueado al login al entrar a "Mi cuenta").
  const [clienteActivo, config] = await Promise.all([obtenerClienteActivoCacheado(), leerConfigSitio()]);
  const titulo = config.tituloPlataforma?.trim() || TITULO_DEFECTO;
  const mostrarLogo = Boolean(config.logoVisible && config.logoUrl);
  const cliente = clienteActivo
    ? { nombre: clienteActivo.nombre, email: clienteActivo.email, avatarUrl: clienteActivo.avatarUrl }
    : null;

  return (
    <header className="sticky top-0 z-20 border-b border-ink-200 bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/70">
      {/* Fila principal. En mobile (base) es una fila compacta —
          hamburguesa + logo/título + carrito — porque el buscador se muda a
          su propia fila de abajo (el "subheader", ver más abajo) en vez de
          competir por espacio acá: antes las 3 columnas (logo+título /
          buscador / acciones) se apretaban tanto en 320-375px de ancho que
          cualquier botón vecino (ej. "Descargar" mostrando el de cancelar,
          o el login) hacía que el buscador se comprimiera hasta quedar casi
          inusable — el motivo real por el que hacía falta MenuMovilCatalogo
          (el drawer con hamburguesa) en vez de seguir angostando columnas.
          Desde "sm" hay ancho de sobra: vuelve al grid centrado de siempre
          (buscador en su propia columna, ancho fijo entre 140-280px) y el
          subheader deja de existir. */}
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(140px,280px)_minmax(0,1fr)] sm:gap-3 sm:px-6">
        {/* Botón de hamburguesa + drawer (navegación/cuenta/descarga) — se
            oculta solo desde "sm" (ver MenuMovilCatalogo), momento en el que
            Descargar y la cuenta vuelven a mostrarse inline más abajo. */}
        <MenuMovilCatalogo cliente={cliente} logoTiendaUrl={config.logoUrl} />

        {/* Logo (si está configurado y visible — ver ConfiguracionForm) +
            título dinámico. "truncate" recorta un título largo en vez de
            romper la fila; el logo nunca se achica (shrink-0) para no verse
            deformado. "flex-1 min-w-0" en mobile: única columna flexible de
            esta fila compacta (hamburguesa y carrito tienen ancho fijo), así
            que es la que cede/gana espacio; desde "sm" vuelve a ser una
            columna de grid normal (flex-none, sizeada por su contenido). */}
        <div className="min-w-0 flex-1 justify-self-start sm:max-w-none sm:flex-none">
          <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2">
            {mostrarLogo && (
              // eslint-disable-next-line @next/next/no-img-element -- URL de Supabase Storage, no un dominio fijo conocido de antemano
              <img src={config.logoUrl!} alt="" className="h-6 w-auto shrink-0 object-contain sm:h-8" />
            )}
            <span className="truncate text-base font-semibold tracking-tight text-ink-900">{titulo}</span>
          </Link>
        </div>

        {/* Buscador: en esta fila SOLO desde "sm" (ver el subheader de abajo
            para mobile) — columna central del grid, mismo de siempre. */}
        <div className="hidden sm:block">
          <BuscadorNavbar />
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:min-w-0 sm:justify-self-end sm:gap-2">
          {/* Descargar y la cuenta: inline acá SOLO desde "sm" — en mobile
              viven como filas dentro del drawer de MenuMovilCatalogo (ver
              ese componente), así la fila compacta de acá arriba no tiene
              que acomodar ninguno de los dos. */}
          <div className="hidden items-center gap-1 sm:flex sm:gap-2">
            <DescargaOffline />
            <CuentaClienteMenu cliente={cliente} logoTiendaUrl={config.logoUrl} />
          </div>
          <CarritoBoton />
        </div>
      </div>

      {/* Subheader — buscador a ancho completo, SOLO mobile. El drawer de
          MenuMovilCatalogo ya cubre navegación/cuenta/descarga ahí, así que
          esta fila queda exclusivamente para buscar, sin compartir espacio
          con ningún botón — a diferencia de la fila de arriba (o la vieja
          grilla de 3 columnas), acá nada más puede empujarlo ni encogerlo. */}
      <div className="border-t border-ink-200 px-4 py-2 sm:hidden">
        <BuscadorNavbar />
      </div>
    </header>
  );
}
